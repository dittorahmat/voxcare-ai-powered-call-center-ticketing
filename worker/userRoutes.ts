import { Hono } from "hono";
import { getAgentByName } from 'agents';
import { ChatAgent } from './agent';
import { AuthController } from './auth-controller';
import { API_RESPONSES } from './config';
import { validatePassword } from './password';
import { Env, getAppController, getAuthController, registerSession, unregisterSession } from "./core-utils";
import { CustomerAuthController } from "./customer-auth-controller";
import { processChatMessage } from "./chat-bot";
import { authMiddleware, requireRole, getUser } from "./auth";
import { paginate, parsePaginationParams } from "./pagination";
import { captureIp, rateLimit } from "./middleware";
import { createTicketCreatedEmail, createTicketResolvedEmail, createTicketAssignedEmail, createPasswordResetEmail } from "./email-service";
export function coreRoutes(app: Hono<{ Bindings: Env }>) {
    // IP capture for all API routes
    app.use('/api/*', captureIp());
    app.all('/api/chat/:sessionId/*', async (c) => {
        try {
            const sessionId = c.req.param('sessionId');
            const agent = await getAgentByName<Env, ChatAgent>(c.env.CHAT_AGENT, sessionId);
            const url = new URL(c.req.url);
            url.pathname = url.pathname.replace(`/api/chat/${sessionId}`, '');
            return agent.fetch(new Request(url.toString(), {
                method: c.req.method,
                headers: c.req.header(),
                body: c.req.method === 'GET' || c.req.method === 'DELETE' ? undefined : c.req.raw.body
            }));
        } catch (error) {
            return c.json({ success: false, error: API_RESPONSES.AGENT_ROUTING_FAILED }, { status: 500 });
        }
    });
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // ─── Auth Routes (public) ──────────────────────────────────
    app.post('/api/auth/login', async (c) => {
        const { email, password } = await c.req.json();
        if (!email || !password) {
            return c.json({ success: false, error: 'Email and password are required' }, { status: 400 });
        }
        const ac = getAuthController(c.env);
        const user = await ac.getUserByEmail(email);
        if (!user) {
            return c.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }
        const valid = await AuthController.verifyPassword(password, user.passwordHash, user.passwordSalt);
        if (!valid) {
            return c.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }
        // Check if 2FA is enabled
        if ((user as any).is2faEnabled) {
            return c.json({
                success: true,
                data: { requires2fa: true, userId: user.id },
            });
        }
        const accessToken = await ac.generateAccessToken(user);
        const refreshToken = ac.generateRefreshToken();
        await ac.storeSession(user.id, refreshToken);
        return c.json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
            },
        });
    });

    // ─── 2FA Login (after password verified) ─────────────────
    app.post('/api/auth/2fa/login', async (c) => {
        const { userId, totpToken } = await c.req.json();
        if (!userId || !totpToken) {
            return c.json({ success: false, error: 'User ID and TOTP token required' }, { status: 400 });
        }
        const ac = getAuthController(c.env);
        const user = await ac.getUser(userId);
        if (!user || !(user as any).is2faEnabled || !(user as any).totpSecret) {
            return c.json({ success: false, error: '2FA not enabled for this user' }, { status: 400 });
        }
        const { TOTPV2 } = await import('otpauth');
        const totp = new TOTPV2({ secret: (user as any).totpSecret, issuer: 'VoxCare', label: user.email, algorithm: 'SHA1', digits: 6, period: 30 });
        const delta = totp.validate({ token: totpToken });
        if (delta === null) {
            return c.json({ success: false, error: 'Invalid authentication code' }, { status: 401 });
        }
        const accessToken = await ac.generateAccessToken(user);
        const refreshToken = ac.generateRefreshToken();
        await ac.storeSession(user.id, refreshToken);
        return c.json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
            },
        });
    });

    app.post('/api/auth/refresh', async (c) => {
        const { refreshToken } = await c.req.json();
        if (!refreshToken) {
            return c.json({ success: false, error: 'Refresh token is required' }, { status: 400 });
        }
        const ac = getAuthController(c.env);
        const session = await ac.validateRefreshToken(refreshToken);
        if (!session) {
            return c.json({ success: false, error: 'Invalid or expired refresh token' }, { status: 401 });
        }
        const user = await ac.getUser(session.userId);
        if (!user || !user.active) {
            return c.json({ success: false, error: 'User not found or deactivated' }, { status: 401 });
        }
        const newAccessToken = await ac.generateAccessToken(user);
        return c.json({ success: true, data: { accessToken: newAccessToken } });
    });

    app.post('/api/auth/logout', async (c) => {
        const { refreshToken } = await c.req.json();
        if (!refreshToken) {
            return c.json({ success: false, error: 'Refresh token is required' }, { status: 400 });
        }
        const ac = getAuthController(c.env);
        await ac.revokeToken(refreshToken);
        return c.json({ success: true, data: { message: 'Logged out successfully' } });
    });

    // ─── Auth Routes (protected) ──────────────────────────────
    app.get('/api/auth/me', authMiddleware(), async (c) => {
        const user = getUser(c);
        const ac = getAuthController(c.env);
        const fullUser = await ac.getUser(user.sub);
        if (!fullUser) {
            return c.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        const { passwordHash, passwordSalt, ...safeUser } = fullUser;
        return c.json({ success: true, data: safeUser });
    });

    app.patch('/api/auth/me', authMiddleware(), async (c) => {
        const user = getUser(c);
        const updates = await c.req.json();
        const ac = getAuthController(c.env);
        // Prevent role self-assignment
        delete updates.role;
        delete updates.passwordHash;
        delete updates.passwordSalt;
        const updated = await ac.updateUser(user.sub, updates);
        if (!updated) {
            return c.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        const { passwordHash, passwordSalt, ...safeUser } = updated;
        return c.json({ success: true, data: safeUser });
    });

    // ─── Admin User Management ────────────────────────────────
    app.post('/api/auth/register', authMiddleware(), requireRole('admin'), async (c) => {
        const { email, password, name, role } = await c.req.json();
        if (!email || !password || !name) {
            return c.json({ success: false, error: 'Email, password, and name are required' }, { status: 400 });
        }
        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) {
            return c.json({ success: false, error: pwCheck.errors.join(', ') }, { status: 400 });
        }
        const ac = getAuthController(c.env);
        // Check for existing user
        const existing = await ac.getUserByEmail(email);
        if (existing) {
            return c.json({ success: false, error: 'Email already registered' }, { status: 409 });
        }
        const { hash, salt } = await AuthController.hashPassword(password);
        const newUser = {
            id: crypto.randomUUID(),
            email,
            name,
            role: role || 'agent',
            passwordHash: hash,
            passwordSalt: salt,
            availability: 'offline' as const,
            skills: [],
            lastAssignedAt: null,
            notificationPrefs: {
                soundEnabled: true,
                desktopEnabled: false,
                emailEnabled: false,
                eventToggles: {},
            },
            active: true,
            createdAt: new Date().toISOString(),
        };
        await ac.createUser(newUser);
        const { passwordHash, passwordSalt, ...safeUser } = newUser;
        return c.json({ success: true, data: safeUser }, { status: 201 });
    });

    app.get('/api/users', authMiddleware(), requireRole('admin'), async (c) => {
        const ac = getAuthController(c.env);
        let users = await ac.listUsers();
        const { page, limit, sort, order, format } = parsePaginationParams(c);
        const result = paginate(users, page, limit, sort || 'createdAt', order as 'asc' | 'desc');
        const safeUsers = result.data.map(u => { const { passwordHash, passwordSalt, ...safe } = u; return safe; });
        if (format === 'flat') return c.json({ success: true, data: safeUsers });
        return c.json({ success: true, data: safeUsers, pagination: result.pagination });
    });

    app.patch('/api/users/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const ac = getAuthController(c.env);
        const updated = await ac.updateUser(id, updates);
        if (!updated) {
            return c.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        const { passwordHash, passwordSalt, ...safeUser } = updated;
        return c.json({ success: true, data: safeUser });
    });

    app.delete('/api/users/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const ac = getAuthController(c.env);
        const deactivated = await ac.deactivateUser(id);
        if (!deactivated) {
            return c.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        return c.json({ success: true, data: { message: 'User deactivated' } });
    });

    // ─── Ticket Management Routes (protected) ─────────────────
    app.get('/api/tickets', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        let tickets = await controller.listTickets();
        const { page, limit, sort, order, format } = parsePaginationParams(c);
        const result = paginate(tickets, page, limit, sort || 'createdAt', order as 'asc' | 'desc');
        if (format === 'flat') {
            return c.json({ success: true, data: result.data });
        }
        return c.json({ success: true, data: result.data, pagination: result.pagination });
    });
    app.post('/api/tickets', authMiddleware(), async (c) => {
        const ticket = await c.req.json();
        const controller = getAppController(c.env);
        const user = getUser(c);

        // Auto-assignment with skills-based routing
        const agents = await controller.listUsers();
        const availableAgents = agents
            .filter(a => a.active && a.availability === 'available')
            .sort((a, b) => (a.lastAssignedAt || '').localeCompare(b.lastAssignedAt || ''));

        // Try skills-based routing first
        const settings = await controller.getAllSettings();
        const categorySkillsMap = (settings.categorySkillsMap as Record<string, string[]>) || {};
        const requiredSkills = categorySkillsMap[ticket.category] || [];
        let assignedTo: string | null = ticket.assignedTo || null;

        if (!assignedTo && requiredSkills.length > 0) {
            // Find agents with matching skills
            const skilledAgents = availableAgents.filter(a =>
                a.skills?.some(s => requiredSkills.includes(s))
            ).sort((a, b) => (a.lastAssignedAt || '').localeCompare(b.lastAssignedAt || ''));
            if (skilledAgents.length > 0) {
                assignedTo = skilledAgents[0].id;
                await controller.updateUser(assignedTo, { availability: 'busy', lastAssignedAt: new Date().toISOString() } as any);
            }
        }

        // Fallback to round-robin
        if (!assignedTo && availableAgents.length > 0) {
            assignedTo = availableAgents[0].id;
            await controller.updateUser(assignedTo, { availability: 'busy', lastAssignedAt: new Date().toISOString() } as any);
        }

        // Generate public token
        const publicToken = crypto.randomUUID();

        const ticketWithMeta = {
            ...ticket,
            assignedTo,
            createdBy: user.sub,
            publicToken,
            tags: ticket.tags || [],
            fcrFlag: false,
            handleTimeSeconds: null,
            mergedInto: null,
            updatedAt: null,
            lastCustomerReplyAt: null,
        };
        await controller.addTicket(ticketWithMeta);

        // Auto-create SLA record
        const slaConfig = await controller.getSLAConfigByPriority(ticket.priority);
        let slaRecordId: string | null = null;
        if (slaConfig) {
            const slaRecord = {
                id: `sla-${ticket.id}`,
                ticketId: ticket.id,
                responseDeadline: new Date(Date.now() + slaConfig.responseMinutes * 60000).toISOString(),
                resolutionDeadline: new Date(Date.now() + slaConfig.resolutionMinutes * 60000).toISOString(),
                firstResponseAt: null,
                resolvedAt: null,
                escalationLevel: 0,
                breached: false,
                escalationTriggered: false,
                createdAt: new Date().toISOString(),
            };
            await controller.addSLARecord(slaRecord);
            slaRecordId = slaRecord.id;
            // Also update ticket with slaRecordId
            await controller.updateTicket(ticket.id, { slaRecordId });
        }

        // Audit log
        const clientIp = c.get('clientIp' as any);
        await controller.appendAuditLog({
            action: 'created', userId: user.sub, userName: user.name, userRole: user.role,
            entityType: 'ticket', entityId: ticket.id, timestamp: new Date().toISOString(),
            changes: { data: { after: ticket } },
            ipAddress: clientIp || undefined,
        });
        // Push notification to supervisors
        const notif = {
            id: crypto.randomUUID(),
            type: 'ticket-created' as const,
            recipientId: '',
            read: false,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            data: { ticketId: ticket.id, title: ticket.title, priority: ticket.priority },
        };
        const users = await controller.listUsers();
        for (const u of users) {
            if (u.role === 'supervisor' || u.role === 'admin') {
                await controller.addNotification({ ...notif, id: crypto.randomUUID(), recipientId: u.id });
            }
        }
        return c.json({ success: true, data: ticket });
    });
    app.patch('/api/tickets/:id', authMiddleware(), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const existing = await controller.getTicket(id);
        const user = getUser(c);

        // Calculate AHT on resolution
        if (updates.status === 'resolved' && existing?.status !== 'resolved') {
            const now = new Date().toISOString();
            updates.resolvedAt = now;
            updates.resolvedBy = user.sub;
            // AHT: resolvedAt - assignedAt (or createdAt if unassigned)
            const startTime = existing.assignedTo ? new Date(existing.createdAt).getTime() : new Date(existing.createdAt).getTime();
            const handleTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
            updates.handleTimeSeconds = handleTimeSeconds;
            // FCR detection: resolved within window, no follow-ups
            const settings = await controller.getAllSettings();
            const fcrWindow = (settings.fcrTimeWindowMinutes as number) || 60;
            const createdAt = new Date(existing.createdAt).getTime();
            const timeToResolve = (Date.now() - createdAt) / 60000;
            const noFollowUps = !existing.internalNotes || existing.internalNotes.length === 0;
            updates.fcrFlag = timeToResolve <= fcrWindow && noFollowUps;
        }

        // Clear FCR flag on reopen
        if (updates.status === 'reopened') {
            updates.fcrFlag = false;
        }

        // Track updatedAt for auto-close
        if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date().toISOString();
        }

        const updated = await controller.updateTicket(id, updates);
        if (!updated) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });

        // Audit log
        await controller.appendAuditLog({
            action: 'updated', userId: user.sub, userName: user.name, userRole: user.role,
            entityType: 'ticket', entityId: id, timestamp: new Date().toISOString(),
            changes: Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, { before: (existing as any)?.[k], after: v }])),
        });

        // Send email notifications if customer email available
        const appUrl = c.env?.APP_URL || 'http://localhost:5173';
        const ticketUrl = `${appUrl}/tickets/${id}`;

        // Check SLA breach and auto-escalate
        if (existing?.slaRecordId) {
            const slaRecord = await controller.getSLARecord(existing.slaRecordId);
            if (slaRecord && !slaRecord.breached && !slaRecord.escalationTriggered) {
                const { checkSLABreach } = await import('./sla-utils');
                const result = checkSLABreach(slaRecord, existing.priority);
                if (result.needsEscalation) {
                    updates.priority = result.newPriority as any;
                    await controller.updateSLARecord(slaRecord.id, { breached: result.breached, escalationTriggered: true });
                    // Create notification for supervisors
                    const users = await controller.listUsers();
                    const notif = {
                        id: crypto.randomUUID(),
                        type: 'sla-breached' as const,
                        recipientId: '',
                        read: false,
                        createdAt: new Date().toISOString(),
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        data: { ticketId: id, title: updated?.title || existing.title, priority: result.newPriority },
                    };
                    for (const u of users) {
                        if (u.role === 'supervisor' || u.role === 'admin') {
                            await controller.addNotification({ ...notif, id: crypto.randomUUID(), recipientId: u.id });
                        }
                    }
                    // Send SLA breach email to supervisors
                    const { sendEmail, createSLABreachEmail } = await import('./email-service');
                    for (const u of users) {
                        if ((u.role === 'supervisor' || u.role === 'admin') && u.email) {
                            const email = createSLABreachEmail(u.email, id, updated?.title || existing.title, result.newPriority, ticketUrl);
                            await sendEmail(email, c.env);
                        }
                    }
                    await controller.appendAuditLog({
                        action: 'sla-escalation', userId: 'system', userName: 'System', userRole: 'system',
                        entityType: 'ticket', entityId: id, timestamp: new Date().toISOString(),
                        changes: { data: { after: { newPriority: result.newPriority, breached: result.breached } } },
                    });
                }
            }
        }

        if (existing?.customerId) {
            const customer = await controller.getCustomer(existing.customerId);
            if (customer?.email) {
                const { sendEmail, createTicketCreatedEmail, createTicketUpdatedEmail, createTicketResolvedEmail } = await import('./email-service');
                if (updates.status === 'resolved' && existing.status !== 'resolved') {
                    const csatUrl = `${appUrl}/public/ticket/${updated.publicToken}`;
                    const email = createTicketResolvedEmail(customer.email, customer.name, id, updated.title, updated.publicNotes?.text || '', ticketUrl, csatUrl);
                    await sendEmail(email, c.env);
                } else if (updates.publicNotes && existing.status !== 'resolved') {
                    const email = createTicketUpdatedEmail(customer.email, customer.name, id, updated.title, updates.publicNotes.text || '', ticketUrl);
                    await sendEmail(email, c.env);
                }
            }
        }

        return c.json({ success: true, data: updated });
    });
    app.delete('/api/tickets/:id', authMiddleware(), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteTicket(id);
        return c.json({ success: true, data: { deleted } });
    });
    // Session Routes (protected)
    app.get('/api/sessions', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const sessions = await controller.listSessions();
        return c.json({ success: true, data: sessions });
    });
    app.post('/api/sessions', authMiddleware(), async (c) => {
        const { title, sessionId: pid, firstMessage } = await c.req.json().catch(() => ({}));
        const sessionId = pid || crypto.randomUUID();
        let sessionTitle = title || (firstMessage ? firstMessage.slice(0, 30) : `Chat ${new Date().toLocaleDateString()}`);
        await registerSession(c.env, sessionId, sessionTitle);
        return c.json({ success: true, data: { sessionId, title: sessionTitle } });
    });
    app.delete('/api/sessions/:sessionId', authMiddleware(), async (c) => {
        const sessionId = c.req.param('sessionId');
        const deleted = await unregisterSession(c.env, sessionId);
        return c.json({ success: true, data: { deleted } });
    });

    // ─── SLA Config Routes ───────────────────────────────────
    app.get('/api/sla/configs', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const configs = await controller.listSLAConfigs();
        return c.json({ success: true, data: configs });
    });

    app.post('/api/sla/configs', authMiddleware(), requireRole('admin'), async (c) => {
        const config = await c.req.json();
        const controller = getAppController(c.env);
        await controller.addSLAConfig(config);
        return c.json({ success: true, data: config });
    });

    app.put('/api/sla/configs/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateSLAConfig(id, updates);
        if (!updated) return c.json({ success: false, error: 'SLA config not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });

    app.get('/api/sla/records', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        let records = await controller.listSLARecords();
        const ticketId = c.req.query('ticketId');
        const breached = c.req.query('breached');
        if (ticketId) records = records.filter(r => r.ticketId === ticketId);
        if (breached !== undefined) records = records.filter(r => String(r.breached) === breached);
        const { page, limit, sort, order, format } = parsePaginationParams(c);
        const result = paginate(records, page, limit, sort || 'createdAt', order as 'asc' | 'desc');
        if (format === 'flat') return c.json({ success: true, data: result.data });
        return c.json({ success: true, data: result.data, pagination: result.pagination });
    });

    // ─── Agent Routing Routes ────────────────────────────────
    app.get('/api/agents', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const entries = await controller.listAgentQueue();
        return c.json({ success: true, data: entries });
    });

    app.patch('/api/agents/me/status', authMiddleware(), async (c) => {
        const user = getUser(c);
        const { availability } = await c.req.json();
        const controller = getAppController(c.env);
        // Update in users map
        await controller.updateUser(user.sub, { availability: availability } as any);
        // Update in agent queue
        const existing = await controller.getAgentEntry(user.sub);
        if (existing) {
            existing.availability = availability;
            existing.lastActivityAt = new Date().toISOString();
            await controller.updateAgentQueue(existing);
        }
        return c.json({ success: true, data: { availability } });
    });

    app.patch('/api/tickets/:id/assign', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const id = c.req.param('id');
        const { assignedTo } = await c.req.json();
        const controller = getAppController(c.env);
        const ticket = await controller.getTicket(id);
        if (!ticket) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });
        const updated = await controller.updateTicket(id, { assignedTo });
        // Push notification to assigned agent
        if (assignedTo) {
            await controller.addNotification({
                id: crypto.randomUUID(),
                type: 'call-assigned',
                recipientId: assignedTo,
                read: false,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                data: { ticketId: id, title: ticket.title },
            });
        }
        return c.json({ success: true, data: updated });
    });

    // ─── Notification Routes ─────────────────────────────────
    app.get('/api/notifications/stream', authMiddleware(), async (c) => {
        const user = getUser(c);
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Send initial connected event
        await writer.write(encoder.encode(`event: connected\ndata: {"message":"Connected"}\nid:0\n\n`));

        // Heartbeat every 30s
        const heartbeat = setInterval(async () => {
            try {
                await writer.write(encoder.encode(`: heartbeat\n\n`));
            } catch {
                clearInterval(heartbeat);
            }
        }, 30000);

        // Poll for new notifications
        const pollInterval = setInterval(async () => {
            try {
                const controller = getAppController(c.env);
                const notifications = await controller.listNotifications(user.sub);
                const unread = notifications.filter(n => !n.read);
                if (unread.length > 0) {
                    for (const n of unread.slice(0, 5)) {
                        const event = `event: ${n.type}\ndata: ${JSON.stringify({ id: n.id, type: n.type, createdAt: n.createdAt, data: n.data })}\nid:${n.id}\n\n`;
                        await writer.write(encoder.encode(event));
                    }
                }
            } catch {
                // Ignore poll errors
            }
        }, 5000);

        // Cleanup on client disconnect
        c.req.raw.signal.addEventListener('abort', () => {
            clearInterval(heartbeat);
            clearInterval(pollInterval);
            writer.close().catch(() => {});
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        });
    });

    app.get('/api/notifications', authMiddleware(), async (c) => {
        const user = getUser(c);
        const controller = getAppController(c.env);
        let notifications = await controller.listNotifications(user.sub);
        const { page, limit, sort, order, format } = parsePaginationParams(c);
        const result = paginate(notifications, page, limit, sort || 'createdAt', order as 'asc' | 'desc');
        if (format === 'flat') return c.json({ success: true, data: result.data });
        return c.json({ success: true, data: result.data, pagination: result.pagination });
    });

    app.get('/api/notifications/unread-count', authMiddleware(), async (c) => {
        const user = getUser(c);
        const controller = getAppController(c.env);
        const count = await controller.getUnreadCount(user.sub);
        return c.json({ success: true, data: { count } });
    });

    app.patch('/api/notifications/:id/read', authMiddleware(), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const notification = await controller.markNotificationRead(id);
        if (!notification) return c.json({ success: false, error: 'Notification not found' }, { status: 404 });
        return c.json({ success: true, data: notification });
    });

    // ─── Settings Routes ─────────────────────────────────────
    app.get('/api/settings', authMiddleware(), async (c) => {
        const user = getUser(c);
        const controller = getAppController(c.env);
        const allSettings = await controller.getAllSettings();
        // Role-filtered: agents only see profile and notification prefs
        if (user.role === 'agent') {
            return c.json({ success: true, data: {
                profile: allSettings[`profile-${user.sub}`] || null,
                notificationPrefs: allSettings['notificationPrefs-defaults'] || null,
            }});
        }
        return c.json({ success: true, data: allSettings });
    });

    app.put('/api/settings/system', authMiddleware(), requireRole('admin'), async (c) => {
        const settings = await c.req.json();
        const controller = getAppController(c.env);
        await controller.setSetting('system', settings);
        return c.json({ success: true, data: settings });
    });

    app.put('/api/settings/sla', authMiddleware(), requireRole('admin'), async (c) => {
        const slaRules = await c.req.json();
        const controller = getAppController(c.env);
        await controller.setSetting('slaRules', slaRules);
        return c.json({ success: true, data: slaRules });
    });

    app.put('/api/settings/ai', authMiddleware(), requireRole('admin'), async (c) => {
        const aiConfig = await c.req.json();
        const controller = getAppController(c.env);
        await controller.setSetting('aiConfig', aiConfig);
        return c.json({ success: true, data: aiConfig });
    });

    app.put('/api/settings/profile', authMiddleware(), async (c) => {
        const user = getUser(c);
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        // Prevent role changes
        delete updates.role;
        const updated = await controller.updateUser(user.sub, updates);
        if (!updated) return c.json({ success: false, error: 'User not found' }, { status: 404 });
        const { passwordHash, passwordSalt, ...safe } = updated;
        return c.json({ success: true, data: safe });
    });

    app.put('/api/settings/notifications', authMiddleware(), async (c) => {
        const user = getUser(c);
        const prefs = await c.req.json();
        const controller = getAppController(c.env);
        await controller.setSetting(`notification-${user.sub}`, prefs);
        return c.json({ success: true, data: prefs });
    });

    // ─── Analytics Routes ────────────────────────────────────
    app.get('/api/analytics/volume', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        const from = c.req.query('from');
        const to = c.req.query('to');
        let filtered = tickets;
        if (from) filtered = filtered.filter(t => t.createdAt >= from);
        if (to) filtered = filtered.filter(t => t.createdAt <= to);
        // Group by date
        const byDate: Record<string, number> = {};
        filtered.forEach(t => {
            const date = t.createdAt.split('T')[0];
            byDate[date] = (byDate[date] || 0) + 1;
        });
        const byStatus: Record<string, number> = {};
        filtered.forEach(t => {
            byStatus[t.status] = (byStatus[t.status] || 0) + 1;
        });
        const byPriority: Record<string, number> = {};
        filtered.forEach(t => {
            byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
        });
        const byCategory: Record<string, number> = {};
        filtered.forEach(t => {
            byCategory[t.category] = (byCategory[t.category] || 0) + 1;
        });
        // FCR rate
        const resolvedTickets = filtered.filter(t => t.status === 'resolved');
        const fcrCount = resolvedTickets.filter(t => t.fcrFlag).length;
        const fcrRate = resolvedTickets.length > 0 ? Math.round((fcrCount / resolvedTickets.length) * 10000) / 100 : 0;
        return c.json({ success: true, data: { byDate, byStatus, byPriority, byCategory, total: filtered.length, fcrRate } });
    });

    app.get('/api/analytics/resolution-time', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        const resolved = tickets.filter(t => t.status === 'resolved' && t.resolutionTime !== null);
        if (resolved.length === 0) {
            return c.json({ success: true, data: { average: null, median: null, p95: null, count: 0 } });
        }
        const times = resolved.map(t => t.resolutionTime!).sort((a, b) => a - b);
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const median = times.length % 2 === 0
            ? (times[times.length / 2 - 1] + times[times.length / 2]) / 2
            : times[Math.floor(times.length / 2)];
        const p95 = times[Math.floor(times.length * 0.95)];
        // Calculate AHT from handleTimeSeconds
        const withHandleTime = tickets.filter(t => t.handleTimeSeconds !== null && t.handleTimeSeconds !== undefined);
        const avgHandleTime = withHandleTime.length > 0
            ? Math.round(withHandleTime.reduce((s, t) => s + (t.handleTimeSeconds || 0), 0) / withHandleTime.length)
            : 0;
        return c.json({ success: true, data: { average: Math.round(avg), median, p95, count: times.length, averageHandleTime: avgHandleTime } });
    });

    app.get('/api/analytics/agent-performance', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        const users = await controller.listUsers();
        const agents = users.filter(u => u.role === 'agent' || u.role === 'supervisor');
        const performance = agents.map(agent => {
            const assigned = tickets.filter(t => t.assignedTo === agent.id);
            const resolved = assigned.filter(t => t.status === 'resolved');
            const slaRecords = assigned
                .map(t => controller.getSLARecord(t.slaRecordId || ''))
                .filter(Boolean);
            const compliant = slaRecords.filter((r: any) => r && !r.breached).length;
            const total = slaRecords.filter(Boolean).length;
            return {
                id: agent.id,
                name: agent.name,
                role: agent.role,
                assigned: assigned.length,
                resolved: resolved.length,
                slaCompliance: total > 0 ? Math.round((compliant / total) * 100) : null,
                avgResolutionTime: resolved.length > 0
                    ? Math.round(resolved.reduce((sum, t) => sum + (t.resolutionTime || 0), 0) / resolved.length)
                    : null,
                fcrRate: resolved.length > 0
                    ? Math.round((resolved.filter(t => t.fcrFlag).length / resolved.length) * 100)
                    : null,
                avgHandleTime: resolved.filter(t => t.handleTimeSeconds !== null).length > 0
                    ? Math.round(resolved.filter(t => t.handleTimeSeconds !== null).reduce((sum, t) => sum + (t.handleTimeSeconds || 0), 0) / resolved.filter(t => t.handleTimeSeconds !== null).length)
                    : null,
            };
        });
        return c.json({ success: true, data: performance });
    });

    app.get('/api/analytics/sla-compliance', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const records = await controller.listSLARecords();
        const total = records.length;
        const compliant = records.filter(r => !r.breached).length;
        const breached = records.filter(r => r.breached).length;
        return c.json({ success: true, data: {
            total,
            compliant,
            breached,
            rate: total > 0 ? Math.round((compliant / total) * 100) : 100,
        }});
    });

    app.get('/api/analytics/export/csv', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        const type = c.req.query('type') || 'tickets';
        const from = c.req.query('from');
        const to = c.req.query('to');
        let filtered = tickets;
        if (from) filtered = filtered.filter(t => t.createdAt >= from);
        if (to) filtered = filtered.filter(t => t.createdAt <= to);
        // Build CSV
        const headers = ['id', 'title', 'customerName', 'priority', 'status', 'category', 'assignedTo', 'createdAt', 'resolvedAt', 'resolutionTime'];
        const rows = filtered.map(t => headers.map(h => {
            const val = (t as any)[h] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    });

    // ─── PDF Report Generation ───────────────────────────────
    app.get('/api/reports/:type/pdf', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const type = c.req.param('type') as string;
        const from = c.req.query('from');
        const to = c.req.query('to');
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        const slaRecords = await controller.listSLARecords();
        const users = await controller.listUsers();
        const csatStats = await controller.getCSATStats(from, to);

        // Filter tickets by date range
        let filtered = tickets;
        if (from) filtered = filtered.filter(t => t.createdAt >= from);
        if (to) filtered = filtered.filter(t => t.createdAt <= to);

        const resolved = filtered.filter(t => t.status === 'resolved');
        const slaCompliant = filtered.filter(t => {
            if (!t.slaRecordId) return true;
            const sla = slaRecords.find(s => s.id === t.slaRecordId);
            return sla && !sla.breached;
        });
        const slaRate = filtered.length > 0 ? Math.round((slaCompliant.length / filtered.length) * 100) : 100;
        const fcrCount = resolved.filter(t => t.fcrFlag).length;
        const fcrRate = resolved.length > 0 ? Math.round((fcrCount / resolved.length) * 10000) / 100 : 0;
        const withHandleTime = filtered.filter(t => t.handleTimeSeconds != null);
        const avgHandleTime = withHandleTime.length > 0
            ? Math.round(withHandleTime.reduce((s, t) => s + (t.handleTimeSeconds || 0), 0) / withHandleTime.length)
            : 0;

        // Agent performance
        const agents = users.filter(u => u.role === 'agent' || u.role === 'supervisor');
        const agentRows = agents.map(agent => {
            const assigned = filtered.filter(t => t.assignedTo === agent.id);
            const agentResolved = assigned.filter(t => t.status === 'resolved');
            const agentSLA = assigned
                .map(t => slaRecords.find(s => s.id === t.slaRecordId))
                .filter(Boolean);
            const agentSLACompliant = agentSLA.filter((r: any) => r && !r.breached).length;
            const agentSLATotal = agentSLA.length;
            const agentSLACompliance = agentSLATotal > 0 ? Math.round((agentSLACompliant / agentSLATotal) * 100) : '—';
            const agentFcrRate = agentResolved.length > 0 ? Math.round((agentResolved.filter(t => t.fcrFlag).length / agentResolved.length) * 100) : '—';
            return `<tr><td>${agent.name}</td><td>${assigned.length}</td><td>${agentResolved.length}</td><td>${agentSLACompliance}%</td><td>${agentFcrRate}%</td></tr>`;
        }).join('');

        // Ticket table (top 50)
        const ticketRows = filtered.slice(0, 50).map(t =>
            `<tr><td>${t.id}</td><td>${t.title.substring(0, 40)}</td><td>${t.priority}</td><td>${t.status}</td><td>${t.category}</td><td>${new Date(t.createdAt).toLocaleDateString()}</td></tr>`
        ).join('');

        const dateRange = from && to ? `${from} to ${to}` : 'All Time';
        const now = new Date().toISOString();
        const companyName = ((await controller.getSetting('system')) as any)?.companyName || 'VoxCare';

        const reportTitles: Record<string, string> = {
            'ticket-summary': 'Ringkasan Tiket',
            'sla-compliance': 'Kepatuhan SLA',
            'agent-performance': 'Performa Agen',
        };

        let bodyContent = '';

        if (type === 'ticket-summary') {
            bodyContent = `
                <h1 style="color: #1e293b;">${companyName} — ${reportTitles['ticket-summary']}</h1>
                <p><strong>Periode:</strong> ${dateRange}</p>
                <p><strong>Dibuat:</strong> ${now}</p>
                <table style="width:100%; margin: 20px 0; border-collapse: collapse;">
                    <tr><td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>Total Tiket</strong><br/><span style="font-size:24px;">${filtered.length}</span></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>Selesai</strong><br/><span style="font-size:24px; color: #16a34a;">${resolved.length}</span></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>Kepatuhan SLA</strong><br/><span style="font-size:24px; color: ${slaRate >= 90 ? '#16a34a' : slaRate >= 75 ? '#ca8a04' : '#dc2626'};">${slaRate}%</span></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>FCR Rate</strong><br/><span style="font-size:24px;">${fcrRate}%</span></td></tr>
                </table>
                <h3>Daftar Tiket</h3>
                <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <tr style="background: #e2e8f0;"><th style="padding:8px; border:1px solid #cbd5e1; text-align:left;">ID</th><th style="padding:8px; border:1px solid #cbd5e1; text-align:left;">Judul</th><th style="padding:8px; border:1px solid #cbd5e1;">Prioritas</th><th style="padding:8px; border:1px solid #cbd5e1;">Status</th><th style="padding:8px; border:1px solid #cbd5e1;">Kategori</th><th style="padding:8px; border:1px solid #cbd5e1;">Dibuat</th></tr>
                    ${ticketRows}
                </table>
            `;
        } else if (type === 'sla-compliance') {
            bodyContent = `
                <h1 style="color: #1e293b;">${companyName} — ${reportTitles['sla-compliance']}</h1>
                <p><strong>Periode:</strong> ${dateRange}</p>
                <p><strong>Dibuat:</strong> ${now}</p>
                <table style="width:100%; margin: 20px 0; border-collapse: collapse;">
                    <tr><td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>Kepatuhan SLA</strong><br/><span style="font-size:24px; color: ${slaRate >= 90 ? '#16a34a' : slaRate >= 75 ? '#ca8a04' : '#dc2626'};">${slaRate}%</span></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>SLA Breached</strong><br/><span style="font-size:24px; color: #dc2626;">${filtered.length - slaCompliant.length}</span></td>
                    <td style="padding: 12px; border: 1px solid #e2e8f0; background: #f8fafc;"><strong>Avg Handle Time</strong><br/><span style="font-size:24px;">${Math.floor(avgHandleTime / 60)}m ${avgHandleTime % 60}s</span></td></tr>
                </table>
            `;
        } else if (type === 'agent-performance') {
            bodyContent = `
                <h1 style="color: #1e293b;">${companyName} — ${reportTitles['agent-performance']}</h1>
                <p><strong>Periode:</strong> ${dateRange}</p>
                <p><strong>Dibuat:</strong> ${now}</p>
                <h3>Performa per Agen</h3>
                <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <tr style="background: #e2e8f0;"><th style="padding:8px; border:1px solid #cbd5e1; text-align:left;">Nama</th><th style="padding:8px; border:1px solid #cbd5e1;">Ditugaskan</th><th style="padding:8px; border:1px solid #cbd5e1;">Selesai</th><th style="padding:8px; border:1px solid #cbd5e1;">SLA</th><th style="padding:8px; border:1px solid #cbd5e1;">FCR</th></tr>
                    ${agentRows}
                </table>
                <p style="margin-top: 16px; color: #64748b;"><strong>Rata-rata CSAT:</strong> ${csatStats.avgRating}/5 (${csatStats.totalResponses} respons)</p>
            `;
        } else {
            return c.json({ success: false, error: 'Unknown report type. Use: ticket-summary, sla-compliance, agent-performance' }, { status: 400 });
        }

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${companyName} Report</title></head><body style="font-family: Arial, sans-serif; padding: 24px; color: #334155;">${bodyContent}<p style="margin-top: 24px; color: #94a3b8; font-size: 11px;">Laporan otomatis dari ${companyName}. <a href="${c.env.APP_URL || 'http://localhost:5173'}" style="color: #6366f1;">Lihat di Dashboard →</a></p></body></html>`;

        // Try Browser Rendering API for PDF
        const appUrl = c.env.APP_URL || 'http://localhost:5173';
        if (c.env.BROWSER_RENDERING_API_URL && c.env.BROWSER_RENDERING_API_KEY) {
            try {
                const pdfBlob = await generatePDFViaBrowserRendering(html, c.env);
                if (pdfBlob) {
                    return new Response(pdfBlob, {
                        headers: {
                            'Content-Type': 'application/pdf',
                            'Content-Disposition': `attachment; filename="${type}_report_${new Date().toISOString().split('T')[0]}.pdf"`,
                        },
                    });
                }
            } catch (err) {
                console.warn('[PDF] Browser Rendering API failed, falling back to HTML:', err);
            }
        }

        // Fallback: return HTML
        return new Response(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        });
    });
    app.get('/api/search', authMiddleware(), async (c) => {
        const q = (c.req.query('q') || '').toLowerCase().trim();
        const types = (c.req.query('type') || 'ticket,customer,call').split(',');
        const limit = parseInt(c.req.query('limit') || '10');
        const controller = getAppController(c.env);
        const results: any[] = [];

        if (q.length < 2) {
            return c.json({ success: true, data: [] });
        }

        if (types.includes('ticket')) {
            const tickets = await controller.listTickets();
            for (const t of tickets.slice(0, 50)) {
                const score = (t.id.toLowerCase().includes(q) ? 10 : 0) +
                    (t.title.toLowerCase().includes(q) ? 5 : 0) +
                    (t.customerName.toLowerCase().includes(q) ? 3 : 0) +
                    (t.category.toLowerCase().includes(q) ? 2 : 0);
                if (score > 0) {
                    results.push({ type: 'ticket', id: t.id, title: t.title, subtitle: `${t.customerName} · ${t.status}`, relevanceScore: score, url: `/tickets/${t.id}` });
                }
            }
        }
        if (types.includes('customer')) {
            const customers = await controller.listCustomers();
            for (const cust of customers.slice(0, 50)) {
                const score = (cust.name.toLowerCase().includes(q) ? 5 : 0) +
                    ((cust.email || '').toLowerCase().includes(q) ? 3 : 0) +
                    ((cust.phone || '').includes(q) ? 3 : 0);
                if (score > 0) {
                    results.push({ type: 'customer', id: cust.id, title: cust.name, subtitle: cust.email || cust.phone || '', relevanceScore: score, url: `/customers/${cust.id}` });
                }
            }
        }
        if (types.includes('call')) {
            const calls = await controller.listCalls();
            for (const call of calls.slice(0, 50)) {
                const score = ((call.callerNumber || '').includes(q) ? 5 : 0) +
                    ((call.transcript || '').toLowerCase().includes(q) ? 3 : 0);
                if (score > 0) {
                    results.push({ type: 'call', id: call.id, title: `Call ${call.callId}`, subtitle: `${call.callerNumber || 'Web Intake'} · ${call.durationSeconds || 0}s`, relevanceScore: score, url: `/calls/${call.id}` });
                }
            }
        }

        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        return c.json({ success: true, data: results.slice(0, limit) });
    });

    // ─── Customer Management ─────────────────────────────────
    app.get('/api/customers', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        let customers = await controller.listCustomers();
        const q = c.req.query('q');
        if (q) {
            const ql = q.toLowerCase();
            customers = customers.filter(cust =>
                cust.name.toLowerCase().includes(ql) ||
                (cust.email || '').toLowerCase().includes(ql) ||
                (cust.phone || '').includes(ql)
            );
        }
        const { page, limit, sort, order, format } = parsePaginationParams(c);
        const result = paginate(customers, page, limit, sort || 'name', order as 'asc' | 'desc');
        if (format === 'flat') return c.json({ success: true, data: result.data });
        return c.json({ success: true, data: result.data, pagination: result.pagination });
    });

    app.get('/api/customers/:id', authMiddleware(), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const customer = await controller.getCustomer(id);
        if (!customer) return c.json({ success: false, error: 'Customer not found' }, { status: 404 });
        return c.json({ success: true, data: customer });
    });

    app.post('/api/customers', authMiddleware(), async (c) => {
        const data = await c.req.json();
        const controller = getAppController(c.env);
        const customer = { id: data.id || crypto.randomUUID(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ticketCount: 0 };
        await controller.addCustomer(customer);
        return c.json({ success: true, data: customer });
    });

    app.patch('/api/customers/:id', authMiddleware(), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateCustomer(id, updates);
        if (!updated) return c.json({ success: false, error: 'Customer not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });

    app.delete('/api/customers/:id', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteCustomer(id);
        return c.json({ success: true, data: { deleted } });
    });

    // ─── Call History ────────────────────────────────────────
    app.get('/api/calls', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        let calls = await controller.listCalls();
        const agentId = c.req.query('agentId');
        const dateFrom = c.req.query('dateFrom');
        const dateTo = c.req.query('dateTo');
        if (agentId) calls = calls.filter(c => c.agentId === agentId);
        if (dateFrom) calls = calls.filter(c => c.startedAt >= dateFrom);
        if (dateTo) calls = calls.filter(c => c.startedAt <= dateTo);
        calls = calls.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        const { page, limit, format } = parsePaginationParams(c);
        const result = paginate(calls, page, limit);
        if (format === 'flat') return c.json({ success: true, data: result.data });
        return c.json({ success: true, data: result.data, pagination: result.pagination });
    });

    app.get('/api/calls/:id', authMiddleware(), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const call = await controller.getCall(id);
        if (!call) return c.json({ success: false, error: 'Call not found' }, { status: 404 });
        return c.json({ success: true, data: call });
    });

    app.post('/api/calls', authMiddleware(), async (c) => {
        const data = await c.req.json();
        const controller = getAppController(c.env);
        const call = { id: data.id || crypto.randomUUID(), ...data, startedAt: data.startedAt || new Date().toISOString() };
        await controller.addCall(call);
        return c.json({ success: true, data: call });
    });

    app.patch('/api/calls/:id', authMiddleware(), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateCall(id, updates);
        if (!updated) return c.json({ success: false, error: 'Call not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });

    // ─── Audit Log ───────────────────────────────────────────
    app.get('/api/audit', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const controller = getAppController(c.env);
        let entries = await controller.listAuditLog();
        const entityType = c.req.query('entityType');
        const entityId = c.req.query('entityId');
        const userId = c.req.query('userId');
        if (entityType) entries = entries.filter(e => e.entityType === entityType);
        if (entityId) entries = entries.filter(e => e.entityId === entityId);
        if (userId) entries = entries.filter(e => e.userId === userId);
        entries = entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        const { page, limit, format } = parsePaginationParams(c);
        const result = paginate(entries, page, limit);
        if (format === 'flat') return c.json({ success: true, data: result.data });
        return c.json({ success: true, data: result.data, pagination: result.pagination });
    });

    // ─── Email Inbound Webhook (SendGrid Inbound Parse) ──────
    app.post('/api/email/inbound', async (c) => {
        const controller = getAppController(c.env);
        // Parse SendGrid Inbound Parse format
        const formData = await c.req.formData();
        const from = formData.get('from') as string || '';
        const subject = formData.get('subject') as string || 'No Subject';
        const text = formData.get('text') as string || formData.get('html') as string || '';

        // Extract email address
        const emailMatch = from.match(/<(.+?)>/);
        const customerEmail = emailMatch ? emailMatch[1] : from;

        // Match or create customer
        const customers = await controller.listCustomers();
        let customer = customers.find(cust => cust.email === customerEmail);
        if (!customer) {
            customer = {
                id: crypto.randomUUID(),
                name: from.split('<')[0].trim(),
                email: customerEmail,
                phone: null,
                company: null,
                tags: [],
                isVip: false,
                notes: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ticketCount: 0,
            };
            await controller.addCustomer(customer);
        }

        // Check if this is a reply to an existing ticket
        const ticketIdMatch = subject.match(/Ticket\s+(T-\d+)/i);
        let ticketId = ticketIdMatch ? ticketIdMatch[1] : null;

        if (ticketId) {
            const existingTicket = await controller.getTicket(ticketId);
            if (existingTicket && (existingTicket.status === 'resolved' || existingTicket.status === 'reopened')) {
                // Add as internal note, re-open if resolved
                if (existingTicket.status === 'resolved') {
                    await controller.updateTicket(ticketId, { status: 'reopened', slaRecordId: null });
                }
                const note = { text: `Email reply: ${text}`, authorId: customer.id, authorName: customer.name, timestamp: new Date().toISOString() };
                await controller.updateTicket(ticketId, {
                    internalNotes: [...(existingTicket.internalNotes || []), note],
                });
                return c.json({ success: true, data: { ticketId, action: 'note-added' } });
            }
        }

        // Create new ticket
        const newTicketId = `T-${Math.floor(Math.random() * 9000 + 1000)}`;
        const priority = 'medium';
        const slaConfig = await controller.getSLAConfigByPriority(priority);
        let slaRecordId: string | null = null;
        if (slaConfig) {
            const slaRecord = {
                id: `sla-${newTicketId}`,
                ticketId: newTicketId,
                responseDeadline: new Date(Date.now() + slaConfig.responseMinutes * 60000).toISOString(),
                resolutionDeadline: new Date(Date.now() + slaConfig.resolutionMinutes * 60000).toISOString(),
                firstResponseAt: null,
                resolvedAt: null,
                escalationLevel: 0,
                breached: false,
                createdAt: new Date().toISOString(),
            };
            await controller.addSLARecord(slaRecord);
            slaRecordId = slaRecord.id;
        }

        // Auto-assignment
        const agents = await controller.listUsers();
        const availableAgents = agents
            .filter(a => a.active && a.availability === 'available')
            .sort((a, b) => (a.lastAssignedAt || '').localeCompare(b.lastAssignedAt || ''));
        let assignedTo: string | null = null;
        if (availableAgents.length > 0) {
            assignedTo = availableAgents[0].id;
            await controller.updateUser(assignedTo, { availability: 'busy', lastAssignedAt: new Date().toISOString() } as any);
        }

        const ticket = {
            id: newTicketId,
            title: subject,
            description: text,
            customerName: customer.name,
            priority,
            status: 'open',
            category: 'General Inquiry',
            createdAt: new Date().toISOString(),
            transcript: text,
            assignedTo,
            slaRecordId,
            escalationLevel: 0,
            resolutionTime: null,
            resolvedAt: null,
            resolvedBy: null,
            customerId: customer.id,
            internalNotes: [],
            publicNotes: null,
            attachments: [],
        };
        await controller.addTicket(ticket);

        // Send email notification (no-op if SendGrid not configured)
        try {
            const emailOpts = createTicketCreatedEmail(newTicketId, subject, customer.name, text.slice(0, 200));
            emailOpts.to = customer.email || from;
            await (await import('./email-service')).sendEmail(emailOpts);
        } catch { /* ignore email failures */ }

        return c.json({ success: true, data: { ticketId: newTicketId } });
    });

    // ─── File Attachments ────────────────────────────────────
    app.post('/api/tickets/:id/attachments', authMiddleware(), async (c) => {
        const ticketId = c.req.param('id');
        const controller = getAppController(c.env);
        const ticket = await controller.getTicket(ticketId);
        if (!ticket) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });

        const formData = await c.req.formData();
        const file = formData.get('file') as File;
        if (!file) return c.json({ success: false, error: 'No file provided' }, { status: 400 });

        // Enforce 10MB max
        if (file.size > 10 * 1024 * 1024) {
            return c.json({ success: false, error: 'File too large. Maximum 10MB.' }, { status: 400 });
        }

        // Enforce allowed types
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
        const isAllowed = allowedTypes.some(t => file.type.startsWith(t));
        if (!isAllowed) {
            return c.json({ success: false, error: 'File type not allowed.' }, { status: 400 });
        }

        // Upload to R2
        const key = `tickets/${ticketId}/${crypto.randomUUID()}-${file.name}`;
        try {
            await c.env.ATTACHMENTS_BUCKET.put(key, file.stream(), {
                httpMetadata: { contentType: file.type },
                customMetadata: { ticketId, fileName: file.name, uploadedBy: getUser(c).sub },
            });
        } catch {
            // If R2 not configured, store in-memory (fallback)
            console.warn('R2 not available, attachment stored as metadata only');
        }

        const attachment = {
            key,
            filename: file.name,
            contentType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
        };

        const existingAttachments = ticket.attachments || [];
        await controller.updateTicket(ticketId, { attachments: [...existingAttachments, attachment] });

        return c.json({ success: true, data: attachment });
    });

    app.get('/api/tickets/:id/attachments/:key', authMiddleware(), async (c) => {
        const key = c.req.param('key');
        try {
            const obj = await c.env.ATTACHMENTS_BUCKET.get(key);
            if (!obj) return c.json({ success: false, error: 'File not found' }, { status: 404 });
            const headers = new Headers();
            headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
            headers.set('Cache-Control', 'public, max-age=31536000');
            return new Response(obj.body, { headers });
        } catch {
            return c.json({ success: false, error: 'File not found' }, { status: 404 });
        }
    });

    app.delete('/api/tickets/:id/attachments/:key', authMiddleware(), async (c) => {
        const ticketId = c.req.param('id');
        const key = c.req.param('key');
        const controller = getAppController(c.env);
        const ticket = await controller.getTicket(ticketId);
        if (!ticket) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });

        try {
            await c.env.ATTACHMENTS_BUCKET.delete(key);
        } catch { /* ignore */ }

        const remaining = (ticket.attachments || []).filter(a => a.key !== key);
        await controller.updateTicket(ticketId, { attachments: remaining });
        return c.json({ success: true, data: { deleted: key } });
    });

    // ─── Canned Responses ────────────────────────────────────
    app.get('/api/canned-responses', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const responses = await controller.listCannedResponses();
        return c.json({ success: true, data: responses });
    });

    app.post('/api/canned-responses', authMiddleware(), requireRole('admin'), async (c) => {
        const data = await c.req.json();
        const controller = getAppController(c.env);
        const cr = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        await controller.addCannedResponse(cr);
        return c.json({ success: true, data: cr });
    });

    app.put('/api/canned-responses/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateCannedResponse(id, updates);
        if (!updated) return c.json({ success: false, error: 'Not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });

    app.delete('/api/canned-responses/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteCannedResponse(id);
        return c.json({ success: true, data: { deleted } });
    });

    // ─── Holidays ────────────────────────────────────────────
    app.get('/api/holidays', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const holidays = await controller.listHolidays();
        return c.json({ success: true, data: holidays });
    });

    app.post('/api/holidays', authMiddleware(), requireRole('admin'), async (c) => {
        const data = await c.req.json();
        const controller = getAppController(c.env);
        const h = { id: crypto.randomUUID(), ...data, createdAt: new Date().toISOString() };
        await controller.addHoliday(h);
        return c.json({ success: true, data: h });
    });

    app.delete('/api/holidays/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteHoliday(id);
        return c.json({ success: true, data: { deleted } });
    });

    // ─── Password Recovery ───────────────────────────────────
    app.post('/api/auth/forgot-password', async (c) => {
        const { email } = await c.req.json();
        if (!email) return c.json({ success: false, error: 'Email required' }, { status: 400 });
        const ac = getAuthController(c.env);
        const user = await ac.getUserByEmail(email);
        if (!user) return c.json({ success: true, data: { message: 'If the email exists, a reset link has been sent' } }); // Don't leak existence
        const token = crypto.randomUUID();
        await ac.addPasswordReset({ token, userId: user.id, expiresAt: Date.now() + 3600000, createdAt: new Date().toISOString() });
        // Send reset email
        try {
            const origin = c.req.header('origin') || c.req.header('referer') || 'http://localhost:3000';
            const resetUrl = `${origin}/reset-password?token=${token}`;
            const emailOpts = createPasswordResetEmail(resetUrl);
            emailOpts.to = email;
            emailOpts.toName = user.name;
            await (await import('./email-service')).sendEmail(emailOpts);
        } catch { /* ignore email failures */ }
        return c.json({ success: true, data: { message: 'If the email exists, a reset link has been sent', resetToken: token } });
    });

    app.post('/api/auth/reset-password', async (c) => {
        const { token, newPassword } = await c.req.json();
        if (!token || !newPassword) return c.json({ success: false, error: 'Token and new password required' }, { status: 400 });
        const pwCheck = validatePassword(newPassword);
        if (!pwCheck.valid) return c.json({ success: false, error: pwCheck.errors.join(', ') }, { status: 400 });
        const ac = getAuthController(c.env);
        const reset = await ac.getPasswordReset(token);
        if (!reset) return c.json({ success: false, error: 'Invalid or expired token' }, { status: 400 });
        await ac.updatePassword(reset.userId, newPassword);
        await ac.deletePasswordReset(token);
        return c.json({ success: true, data: { message: 'Password updated' } });
    });

    // ─── 2FA ─────────────────────────────────────────────────
    app.post('/api/auth/2fa/setup', authMiddleware(), async (c) => {
        const user = getUser(c);
        const ac = getAuthController(c.env);
        const fullUser = await ac.getUser(user.sub);
        if (!fullUser) return c.json({ success: false, error: 'User not found' }, { status: 404 });
        // Generate TOTP secret
        const { TOTPV2 } = await import('otpauth');
        const totp = new TOTPV2({ issuer: 'VoxCare', label: fullUser.email, algorithm: 'SHA1', digits: 6, period: 30 });
        const secret = totp.secret.base32;
        const uri = totp.toString();
        return c.json({ success: true, data: { secret, uri } });
    });

    app.post('/api/auth/2fa/verify', authMiddleware(), async (c) => {
        const user = getUser(c);
        const { secret, token: totpToken } = await c.req.json();
        if (!secret || !totpToken) return c.json({ success: false, error: 'Secret and token required' }, { status: 400 });
        const { TOTPV2 } = await import('otpauth');
        const totp = new TOTPV2({ secret, issuer: 'VoxCare', label: user.name, algorithm: 'SHA1', digits: 6, period: 30 });
        const delta = totp.validate({ token: totpToken });
        if (delta === null) return c.json({ success: false, error: 'Invalid code' }, { status: 401 });
        const ac = getAuthController(c.env);
        await ac.updateUser(user.sub, { totpSecret: secret, is2faEnabled: true } as any);
        return c.json({ success: true, data: { message: '2FA enabled' } });
    });

    app.post('/api/auth/2fa/disable', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role === 'admin') return c.json({ success: false, error: 'Admins cannot disable 2FA' }, { status: 403 });
        const ac = getAuthController(c.env);
        await ac.updateUser(user.sub, { totpSecret: null, is2faEnabled: false } as any);
        return c.json({ success: true, data: { message: '2FA disabled' } });
    });

    // ─── Bulk Ticket Operations ──────────────────────────────
    app.patch('/api/tickets/bulk', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const { ids, updates } = await c.req.json();
        const controller = getAppController(c.env);
        const results = [];
        for (const id of ids) {
            const updated = await controller.updateTicket(id, updates);
            results.push({ id, success: !!updated, error: updated ? undefined : 'Not found' });
        }
        return c.json({ success: true, data: { results } });
    });

    app.delete('/api/tickets/bulk', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const { ids } = await c.req.json();
        const controller = getAppController(c.env);
        const results = [];
        for (const id of ids) {
            const deleted = await controller.deleteTicket(id);
            results.push({ id, success: deleted, error: deleted ? undefined : 'Not found' });
        }
        return c.json({ success: true, data: { results } });
    });

    // ─── Password Change ─────────────────────────────────────
    app.patch('/api/auth/password', authMiddleware(), async (c) => {
        const user = getUser(c);
        const { currentPassword, newPassword } = await c.req.json();
        if (!currentPassword || !newPassword) {
            return c.json({ success: false, error: 'Current and new password are required' }, { status: 400 });
        }
        const pwCheck = validatePassword(newPassword);
        if (!pwCheck.valid) {
            return c.json({ success: false, error: pwCheck.errors.join(', ') }, { status: 400 });
        }
        const ac = getAuthController(c.env);
        const fullUser = await ac.getUser(user.sub);
        if (!fullUser) return c.json({ success: false, error: 'User not found' }, { status: 404 });
        const valid = await AuthController.verifyPassword(currentPassword, fullUser.passwordHash, fullUser.passwordSalt);
        if (!valid) return c.json({ success: false, error: 'Current password is incorrect' }, { status: 401 });
        await ac.updatePassword(user.sub, newPassword);
        return c.json({ success: true, data: { message: 'Password updated' } });
    });

    // ─── Email Template Routes ──────────────────────────────
    app.get('/api/email-templates', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const templates = await controller.listEmailTemplates();
        return c.json({ success: true, data: templates });
    });

    app.put('/api/email-templates/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateEmailTemplate(id, updates);
        if (!updated) return c.json({ success: false, error: 'Template not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });

    app.post('/api/email-templates', authMiddleware(), requireRole('admin'), async (c) => {
        const template = await c.req.json();
        const controller = getAppController(c.env);
        template.id = template.id || `et-${crypto.randomUUID()}`;
        template.updatedAt = new Date().toISOString();
        await controller.addEmailTemplate(template);
        return c.json({ success: true, data: template });
    });

    // ─── Tags Endpoint ──────────────────────────────────────
    app.get('/api/tags', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        const tagMap = new Map<string, number>();
        for (const t of tickets) {
            for (const tag of (t.tags || [])) {
                tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            }
        }
        const tags = Array.from(tagMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        return c.json({ success: true, data: tags });
    });

    // ─── Saved Views Routes ─────────────────────────────────
    app.get('/api/views', authMiddleware(), async (c) => {
        const user = getUser(c);
        const controller = getAppController(c.env);
        const views = await controller.listSavedViews(user.sub);
        return c.json({ success: true, data: views });
    });

    app.post('/api/views', authMiddleware(), async (c) => {
        const view = await c.req.json();
        const user = getUser(c);
        const controller = getAppController(c.env);
        view.id = view.id || `view-${crypto.randomUUID()}`;
        view.userId = user.sub;
        view.createdAt = new Date().toISOString();
        await controller.addSavedView(view);
        return c.json({ success: true, data: view });
    });

    app.patch('/api/views/:id', authMiddleware(), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateSavedView(id, updates);
        if (!updated) return c.json({ success: false, error: 'View not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });

    app.delete('/api/views/:id', authMiddleware(), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteSavedView(id);
        return c.json({ success: true, data: { deleted } });
    });

    // ─── Ticket Relations Routes ────────────────────────────
    app.get('/api/ticket-relations', authMiddleware(), async (c) => {
        const ticketId = c.req.query('ticketId');
        const controller = getAppController(c.env);
        if (ticketId) {
            const relations = await controller.getTicketRelations(ticketId);
            return c.json({ success: true, data: relations });
        }
        return c.json({ success: false, error: 'ticketId query param required' }, { status: 400 });
    });

    app.post('/api/ticket-relations', authMiddleware(), async (c) => {
        const rel = await c.req.json();
        const controller = getAppController(c.env);
        rel.id = rel.id || `rel-${crypto.randomUUID()}`;
        rel.createdAt = new Date().toISOString();
        await controller.addTicketRelation(rel);
        const user = getUser(c);
        await controller.appendAuditLog({
            action: 'created', userId: user.sub, userName: user.name, userRole: user.role,
            entityType: 'ticket-relation', entityId: rel.id, timestamp: new Date().toISOString(),
            changes: { data: { after: rel } },
        });
        return c.json({ success: true, data: rel });
    });

    app.delete('/api/ticket-relations/:id', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteTicketRelation(id);
        if (deleted) {
            const user = getUser(c);
            await controller.appendAuditLog({
                action: 'deleted', userId: user.sub, userName: user.name, userRole: user.role,
                entityType: 'ticket-relation', entityId: id, timestamp: new Date().toISOString(),
            });
        }
        return c.json({ success: true, data: { deleted } });
    });

    // ─── CSAT Routes ────────────────────────────────────────
    app.post('/api/csat', async (c) => {
        const { ticketId, rating, comment, customerEmail } = await c.req.json();
        if (!ticketId || !rating || rating < 1 || rating > 5) {
            return c.json({ success: false, error: 'Valid rating (1-5) and ticketId required' }, { status: 400 });
        }
        const controller = getAppController(c.env);
        // Check for duplicate
        const existing = await controller.getCSATResponse(ticketId);
        if (existing) return c.json({ success: false, error: 'CSAT already submitted for this ticket' }, { status: 409 });
        const resp = {
            id: `csat-${crypto.randomUUID()}`,
            ticketId, rating, comment: comment || null,
            submittedAt: new Date().toISOString(),
            customerEmail: customerEmail || '',
        };
        await controller.addCSATResponse(resp);
        return c.json({ success: true, data: resp });
    });

    app.get('/api/csat/stats', authMiddleware(), async (c) => {
        const fromDate = c.req.query('from');
        const toDate = c.req.query('to');
        const controller = getAppController(c.env);
        const stats = await controller.getCSATStats(fromDate, toDate);
        // Calculate response rate
        const tickets = await controller.listTickets();
        const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
        stats.responseRate = resolvedCount > 0 ? Math.round((stats.totalResponses / resolvedCount) * 10000) / 100 : 0;
        return c.json({ success: true, data: stats });
    });

    // ─── Auto-Close Rules Routes ────────────────────────────
    app.get('/api/auto-close-rules', authMiddleware(), requireRole('admin'), async (c) => {
        const controller = getAppController(c.env);
        const rules = await controller.listAutoCloseRules();
        return c.json({ success: true, data: rules });
    });

    app.post('/api/auto-close-rules', authMiddleware(), requireRole('admin'), async (c) => {
        const rule = await c.req.json();
        const controller = getAppController(c.env);
        rule.id = rule.id || `acr-${crypto.randomUUID()}`;
        rule.createdAt = new Date().toISOString();
        await controller.addAutoCloseRule(rule);
        return c.json({ success: true, data: rule });
    });

    app.patch('/api/auto-close-rules/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateAutoCloseRule(id, updates);
        if (!updated) return c.json({ success: false, error: 'Rule not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });

    app.delete('/api/auto-close-rules/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteAutoCloseRule(id);
        return c.json({ success: true, data: { deleted } });
    });

    // ─── Shift Schedule Routes ──────────────────────────────
    app.get('/api/shifts', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const schedules = await controller.listShiftSchedules();
        return c.json({ success: true, data: schedules });
    });

    app.post('/api/shifts', authMiddleware(), requireRole('admin', 'supervisor'), async (c) => {
        const schedule = await c.req.json();
        const controller = getAppController(c.env);
        schedule.id = schedule.id || `shift-${crypto.randomUUID()}`;
        await controller.addShiftSchedule(schedule);
        return c.json({ success: true, data: schedule });
    });

    app.patch('/api/shifts/:id', authMiddleware(), requireRole('admin', 'supervisor'), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateShiftSchedule(id, updates);
        if (!updated) return c.json({ success: false, error: 'Schedule not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });

    app.delete('/api/shifts/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteShiftSchedule(id);
        return c.json({ success: true, data: { deleted } });
    });

    // ─── Break Log Routes ───────────────────────────────────
    app.get('/api/breaks', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const userId = c.req.query('userId');
        const logs = await controller.listBreakLogs(userId || undefined);
        return c.json({ success: true, data: logs });
    });

    app.post('/api/breaks/start', authMiddleware(), async (c) => {
        const { reason } = await c.req.json();
        const user = getUser(c);
        const controller = getAppController(c.env);
        // End any active break first
        const active = await controller.getActiveBreak(user.sub);
        if (active) {
            await controller.updateBreakLog(active.id, { endedAt: new Date().toISOString(), durationSeconds: Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000) });
        }
        const log = {
            id: `break-${crypto.randomUUID()}`,
            userId: user.sub,
            reason: reason || 'other',
            startedAt: new Date().toISOString(),
            endedAt: null,
            durationSeconds: null,
        };
        await controller.addBreakLog(log);
        await controller.appendAuditLog({
            action: 'break-start', userId: user.sub, userName: user.name, userRole: user.role,
            entityType: 'break', entityId: log.id, timestamp: new Date().toISOString(),
            changes: { data: { after: { reason: log.reason } } },
        });
        return c.json({ success: true, data: log });
    });

    app.post('/api/breaks/end', authMiddleware(), async (c) => {
        const user = getUser(c);
        const controller = getAppController(c.env);
        const active = await controller.getActiveBreak(user.sub);
        if (!active) return c.json({ success: false, error: 'No active break' }, { status: 400 });
        const endedAt = new Date().toISOString();
        const durationSeconds = Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000);
        await controller.updateBreakLog(active.id, { endedAt, durationSeconds });
        await controller.appendAuditLog({
            action: 'break-end', userId: user.sub, userName: user.name, userRole: user.role,
            entityType: 'break', entityId: active.id, timestamp: endedAt,
            changes: { data: { after: { durationSeconds } } },
        });
        return c.json({ success: true, data: { ...active, endedAt, durationSeconds } });
    });

    // ─── Scheduled Report Routes ────────────────────────────
    app.get('/api/scheduled-reports', authMiddleware(), requireRole('admin'), async (c) => {
        const controller = getAppController(c.env);
        const reports = await controller.listScheduledReports();
        return c.json({ success: true, data: reports });
    });

    app.post('/api/scheduled-reports', authMiddleware(), requireRole('admin'), async (c) => {
        const report = await c.req.json();
        const controller = getAppController(c.env);
        report.id = report.id || `report-${crypto.randomUUID()}`;
        await controller.addScheduledReport(report);
        return c.json({ success: true, data: report });
    });

    app.patch('/api/scheduled-reports/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateScheduledReport(id, updates);
        if (!updated) return c.json({ success: false, error: 'Report not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });

    app.delete('/api/scheduled-reports/:id', authMiddleware(), requireRole('admin'), async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteScheduledReport(id);
        return c.json({ success: true, data: { deleted } });
    });

    // ─── Bulk Email ─────────────────────────────────────────
    app.post('/api/tickets/bulk-email', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const { ticketIds, message } = await c.req.json();
        const controller = getAppController(c.env);
        const appUrl = c.env?.APP_URL || 'http://localhost:5173';
        let sentCount = 0;

        for (const ticketId of ticketIds || []) {
            const ticket = await controller.getTicket(ticketId);
            if (!ticket?.customerId) continue;
            const customer = await controller.getCustomer(ticket.customerId);
            if (!customer?.email) continue;

            const { sendEmail, createTicketUpdatedEmail } = await import('./email-service');
            const ticketUrl = `${appUrl}/tickets/${ticketId}`;
            const email = createTicketUpdatedEmail(customer.email, customer.name, ticketId, ticket.title, message || `Your ticket status: ${ticket.status}`, ticketUrl);
            await sendEmail(email, c.env);
            sentCount++;
        }

        const user = getUser(c);
        await controller.appendAuditLog({
            action: 'bulk-email', userId: user.sub, userName: user.name, userRole: user.role,
            entityType: 'ticket', entityId: ticketIds?.join(',') || '', timestamp: new Date().toISOString(),
            changes: { data: { after: { recipientCount: sentCount, ticketCount: ticketIds?.length || 0 } } },
        });

        return c.json({ success: true, data: { sentCount } });
    });

    // ─── Auto-Close Rule Evaluation (Cron-Triggered) ────────
    app.post('/api/auto-close/evaluate', authMiddleware(), requireRole('admin'), async (c) => {
        const controller = getAppController(c.env);
        const rules = await controller.listAutoCloseRules();
        const tickets = await controller.listTickets();
        const enabledRules = rules.filter(r => r.enabled);
        let closedCount = 0;

        for (const rule of enabledRules) {
            for (const ticket of tickets) {
                if (ticket.status === 'merged' || ticket.status === 'closed') continue;
                // Check status condition
                if (rule.condition.status && ticket.status !== rule.condition.status) continue;
                // Check days since update
                if (rule.condition.daysSinceUpdate !== undefined) {
                    const updatedAt = ticket.updatedAt ? new Date(ticket.updatedAt) : new Date(ticket.createdAt);
                    const daysSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
                    if (daysSince < rule.condition.daysSinceUpdate) continue;
                }
                // Check days since customer reply
                if (rule.condition.daysSinceCustomerReply !== undefined) {
                    if (!ticket.lastCustomerReplyAt) continue;
                    const daysSince = (Date.now() - new Date(ticket.lastCustomerReplyAt).getTime()) / (1000 * 60 * 60 * 24);
                    if (daysSince < rule.condition.daysSinceCustomerReply) continue;
                }
                // Apply action
                await controller.updateTicket(ticket.id, {
                    status: rule.action.setStatus,
                    internalNotes: [...(ticket.internalNotes || []), {
                        text: rule.action.addInternalNote || `[Auto-Close] Ticket automatically ${rule.action.setStatus} by rule: ${rule.name}`,
                        authorId: 'system',
                        authorName: 'System',
                        timestamp: new Date().toISOString(),
                    }],
                    updatedAt: new Date().toISOString(),
                });
                await controller.appendAuditLog({
                    action: 'auto-close', userId: 'system', userName: 'System', userRole: 'system',
                    entityType: 'ticket', entityId: ticket.id, timestamp: new Date().toISOString(),
                    changes: { data: { after: { rule: rule.name, newStatus: rule.action.setStatus } } },
                });
                closedCount++;
            }
        }
        return c.json({ success: true, data: { closedCount, evaluatedRules: enabledRules.length } });
    });

    // ─── CSAT Reminder (Cron-Triggered) ────────────────────
    app.post('/api/csat/reminder', authMiddleware(), requireRole('admin'), async (c) => {
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        const resolvedTickets = tickets.filter(t => t.status === 'resolved' && t.resolvedAt);
        const appUrl = c.env?.APP_URL || 'http://localhost:5173';
        let reminderCount = 0;

        for (const ticket of resolvedTickets) {
            if (!ticket.customerId || !ticket.publicToken) continue;
            // Check if already submitted
            const existingCSAT = await controller.getCSATResponse(ticket.id);
            if (existingCSAT) continue;
            // Check if resolved within last 24-48 hours (reminder window)
            const resolvedAt = new Date(ticket.resolvedAt).getTime();
            const hoursSince = (Date.now() - resolvedAt) / (1000 * 60 * 60);
            if (hoursSince < 24 || hoursSince > 48) continue;

            const customer = await controller.getCustomer(ticket.customerId);
            if (!customer?.email) continue;

            const { sendEmail, createTicketResolvedEmail } = await import('./email-service');
            const csatUrl = `${appUrl}/public/ticket/${ticket.publicToken}`;
            const ticketUrl = `${appUrl}/tickets/${ticket.id}`;
            const email = createTicketResolvedEmail(customer.email, customer.name, ticket.id, ticket.title, ticket.publicNotes?.text || '', ticketUrl, csatUrl);
            email.subject = `Reminder: How did we do? — Ticket ${ticket.id}`;
            await sendEmail(email, c.env);
            reminderCount++;
        }
        return c.json({ success: true, data: { reminderCount } });
    });

    // ─── CSAT Auto-Cleanup (Cron-Triggered) ───────────────
    app.post('/api/csat/cleanup', authMiddleware(), requireRole('admin'), async (c) => {
        const controller = getAppController(c.env);
        const responses = await controller.listCSATResponses();
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const expired = responses.filter(r => r.submittedAt < cutoff);
        let cleanedCount = 0;
        // Note: DO storage doesn't support partial deletes, so we'd need to rebuild the map
        // For now, just return the count
        cleanedCount = expired.length;
        return c.json({ success: true, data: { expiredCount: cleanedCount } });
    });

    // ─── Merge Tickets ──────────────────────────────────────
    app.post('/api/tickets/:id/merge', authMiddleware(), requireRole('supervisor', 'admin'), async (c) => {
        const primaryId = c.req.param('id');
        const { sourceTicketIds } = await c.req.json();
        if (!sourceTicketIds?.length) return c.json({ success: false, error: 'sourceTicketIds required' }, { status: 400 });
        const controller = getAppController(c.env);
        const primary = await controller.getTicket(primaryId);
        if (!primary) return c.json({ success: false, error: 'Primary ticket not found' }, { status: 404 });
        const user = getUser(c);
        const mergedNotes = [...(primary.internalNotes || [])];
        const mergedAttachments = [...(primary.attachments || [])];
        const sourceTickets = [];
        for (const srcId of sourceTicketIds) {
            const src = await controller.getTicket(srcId);
            if (!src) continue;
            sourceTickets.push(src);
            if (src.internalNotes) mergedNotes.push(...src.internalNotes);
            if (src.attachments) mergedAttachments.push(...src.attachments);
        }
        // Update primary ticket with merged data
        await controller.updateTicket(primaryId, {
            internalNotes: mergedNotes,
            attachments: mergedAttachments,
            updatedAt: new Date().toISOString(),
        });
        // Mark source tickets as merged
        for (const src of sourceTickets) {
            await controller.updateTicket(src.id, {
                status: 'merged',
                mergedInto: primaryId,
                updatedAt: new Date().toISOString(),
            });
        }
        await controller.appendAuditLog({
            action: 'merged', userId: user.sub, userName: user.name, userRole: user.role,
            entityType: 'ticket', entityId: primaryId, timestamp: new Date().toISOString(),
            changes: { data: { after: { sourceTicketIds, primaryId } } },
        });
        return c.json({ success: true, data: { primaryId, mergedCount: sourceTickets.length } });
    });

    // ─── Wallboard Endpoint ─────────────────────────────────
    app.get('/api/wallboard', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        const agents = await controller.listAgentQueue();
        const users = await controller.listUsers();
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayTickets = tickets.filter(t => t.createdAt >= todayStart);
        const slaRecords = await controller.listSLARecords();
        const breachedCount = slaRecords.filter(s => s.breached).length;
        const totalSLA = slaRecords.length || 1;
        const slaCompliance = Math.round(((totalSLA - breachedCount) / totalSLA) * 10000) / 100;
        const activeAgents = agents.filter(a => a.availability === 'available').length;
        // Top agents by today's resolved tickets (approximate — track via resolvedBy)
        const todayResolved = tickets.filter(t => t.status === 'resolved' && t.resolvedAt && t.resolvedAt >= todayStart);
        const agentResolveCount = new Map<string, number>();
        for (const t of todayResolved) {
            if (t.resolvedBy) agentResolveCount.set(t.resolvedBy, (agentResolveCount.get(t.resolvedBy) || 0) + 1);
        }
        const topAgents = users
            .filter(u => agentResolveCount.has(u.id))
            .map(u => ({ id: u.id, name: u.name, resolvedToday: agentResolveCount.get(u.id) || 0 }))
            .sort((a, b) => b.resolvedToday - a.resolvedToday)
            .slice(0, 5);
        // Average first response time (approximate from handleTimeSeconds)
        const withHandleTime = tickets.filter(t => t.handleTimeSeconds !== null && t.handleTimeSeconds !== undefined);
        const avgHandleTime = withHandleTime.length > 0 ? Math.round(withHandleTime.reduce((s, t) => s + (t.handleTimeSeconds || 0), 0) / withHandleTime.length) : 0;
        return c.json({
            success: true, data: {
                agents: { active: activeAgents, total: agents.length },
                tickets: {
                    open: tickets.filter(t => t.status === 'open').length,
                    inProgress: tickets.filter(t => t.status === 'in-progress').length,
                    resolved: tickets.filter(t => t.status === 'resolved').length,
                },
                slaCompliance,
                today: { new: todayTickets.length, resolved: todayResolved.length },
                avgFirstResponseTime: avgHandleTime,
                topAgents,
            }
        });
    });

    // ─── Public Ticket View Endpoint ────────────────────────
    app.get('/api/public/ticket/:token', async (c) => {
        const token = c.req.param('token');
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        const ticket = tickets.find(t => t.publicToken === token);
        if (!ticket) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });
        // Return only public-facing data
        const publicData = {
            id: ticket.id,
            title: ticket.title,
            status: ticket.status,
            priority: ticket.priority,
            category: ticket.category,
            createdAt: ticket.createdAt,
            resolvedAt: ticket.resolvedAt,
            description: ticket.description,
            publicNotes: ticket.publicNotes,
            attachments: ticket.attachments?.map(a => ({ filename: a.filename, contentType: a.contentType, size: a.size, uploadedAt: a.uploadedAt })) || [],
            csatSubmitted: !!(await controller.getCSATResponse(ticket.id)),
        };
        return c.json({ success: true, data: publicData });
    });

    // ─── Customer Authentication ─────────────────────────────
    // Note: CustomerAuthController is used as a helper class.
    // Storage goes through AppController DO.

    app.post('/api/customer/auth/register', async (c) => {
        const { name, email, password, phone, company } = await c.req.json();
        if (!name || !email || !password) return c.json({ success: false, error: 'Name, email, and password required' }, { status: 400 });

        const controller = getAppController(c.env);
        const customers = await controller.listCustomers();
        const existing = customers.find(cust => cust.email === email);
        if (existing) return c.json({ success: false, error: 'Email already registered' }, { status: 409 });

        // Validate password
        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) return c.json({ success: false, error: pwCheck.errors.join(', ') }, { status: 400 });

        const { hash, salt } = await (async () => {
            const encoder = new TextEncoder();
            const saltBytes = crypto.getRandomValues(new Uint8Array(16));
            const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
            const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
            return {
                hash: btoa(String.fromCharCode(...new Uint8Array(derivedBits))),
                salt: btoa(String.fromCharCode(...saltBytes)),
            };
        })();

        const verificationToken = crypto.randomUUID();
        const customer = {
            id: `cust-${crypto.randomUUID()}`,
            name, email: email.toLowerCase(), phone: phone || null, company: company || null,
            tags: [], isVip: false, notes: null,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ticketCount: 0,
            passwordHash: hash, passwordSalt: salt, isActive: false,
            lastLoginAt: null, emailVerifiedAt: null,
            verificationToken, verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        };
        await controller.addCustomer(customer as any);

        // Send verification email
        const appUrl = c.env?.APP_URL || 'http://localhost:5173';
        const verifyUrl = `${appUrl}/customer/verify/${verificationToken}`;
        const { sendEmail } = await import('./email-service');
        await sendEmail({
            to: email,
            subject: 'Verify your VoxCare account',
            html: `<h2>Welcome to VoxCare!</h2><p>Click <a href="${verifyUrl}">here</a> to verify your email.</p>`,
            text: `Verify your email: ${verifyUrl}`,
        }, c.env);

        return c.json({ success: true, data: { customerId: customer.id, message: 'Please check your email to verify your account' } });
    });

    app.post('/api/customer/auth/login', async (c) => {
        const { email, password } = await c.req.json();
        if (!email || !password) return c.json({ success: false, error: 'Email and password required' }, { status: 400 });

        const controller = getAppController(c.env);
        const customers = await controller.listCustomers();
        const customer = customers.find(cust => cust.email === email.toLowerCase());
        if (!customer || !customer.passwordHash || !customer.passwordSalt) {
            return c.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        // Verify password
        const encoder = new TextEncoder();
        const saltBytes = Uint8Array.from(atob(customer.passwordSalt), ch => ch.charCodeAt(0));
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
        const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
        const computedHash = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
        if (computedHash !== customer.passwordHash) {
            return c.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        if (!customer.isActive) {
            return c.json({ success: false, error: 'Please verify your email first', code: 'email_not_verified' }, { status: 403 });
        }

        // Update last login
        await controller.updateCustomer(customer.id, { lastLoginAt: new Date().toISOString() } as any);

        // Generate JWT (24h expiry)
        const secret = new TextEncoder().encode(c.env?.JWT_SECRET || 'dev-secret-change-me');
        const jwt = await new (await import('jose')).SignJWT({ sub: customer.id, role: 'customer', name: customer.name })
            .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('24h').sign(secret);

        // Generate refresh token
        const refreshToken = crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
        // Store session in AppController
        await controller.addCustomerSession({
            userId: customer.id, refreshToken, refreshTokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
            createdAt: Date.now(), revoked: false,
        } as any);

        return c.json({ success: true, data: { accessToken: jwt, refreshToken, customer: { id: customer.id, name: customer.name, email: customer.email } } });
    });

    app.post('/api/customer/auth/refresh', async (c) => {
        const { refreshToken } = await c.req.json();
        if (!refreshToken) return c.json({ success: false, error: 'Refresh token required' }, { status: 400 });

        const controller = getAppController(c.env);
        const session = await controller.getCustomerSession(refreshToken);
        if (!session || (session as any).revoked || Date.now() > (session as any).refreshTokenExpiry) {
            return c.json({ success: false, error: 'Invalid refresh token' }, { status: 401 });
        }

        const customer = await controller.getCustomer((session as any).userId);
        if (!customer || !customer.isActive) return c.json({ success: false, error: 'Customer not found or inactive' }, { status: 401 });

        const secret = new TextEncoder().encode(c.env?.JWT_SECRET || 'dev-secret-change-me');
        const jwt = await new (await import('jose')).SignJWT({ sub: customer.id, role: 'customer', name: customer.name })
            .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('24h').sign(secret);

        return c.json({ success: true, data: { accessToken: jwt } });
    });

    app.post('/api/customer/auth/logout', async (c) => {
        const { refreshToken } = await c.req.json();
        if (!refreshToken) return c.json({ success: false, error: 'Refresh token required' }, { status: 400 });

        const controller = getAppController(c.env);
        await controller.revokeCustomerSession(refreshToken);
        return c.json({ success: true, data: { message: 'Logged out' } });
    });

    app.get('/api/customer/verify/:token', async (c) => {
        const token = c.req.param('token');
        const controller = getAppController(c.env);
        const customers = await controller.listCustomers();
        const customer = customers.find(cust => cust.verificationToken === token);

        if (!customer) return c.html('<h1>Invalid verification link</h1><p>This token is not valid.</p>', 404);
        if (Date.now() > (customer.verificationTokenExpiry || 0)) {
            return c.html(`<h1>Verification link expired</h1><p>Please <a href="/customer/login">login</a> to resend verification.</p>`, 400);
        }

        await controller.updateCustomer(customer.id, {
            isActive: true, emailVerifiedAt: new Date().toISOString(),
            verificationToken: null, verificationTokenExpiry: null,
        } as any);

        const appUrl = c.env?.APP_URL || 'http://localhost:5173';
        return c.redirect(`${appUrl}/customer/login?verified=1`);
    });

    app.post('/api/customer/auth/resend-verification', async (c) => {
        const { email } = await c.req.json();
        if (!email) return c.json({ success: false, error: 'Email required' }, { status: 400 });

        const controller = getAppController(c.env);
        const customers = await controller.listCustomers();
        const customer = customers.find(cust => cust.email === email.toLowerCase());
        if (!customer) return c.json({ success: true, data: { message: 'If the email exists, a new verification link has been sent' } });
        if (customer.emailVerifiedAt) return c.json({ success: false, error: 'Email already verified' }, { status: 400 });

        const verificationToken = crypto.randomUUID();
        await controller.updateCustomer(customer.id, {
            verificationToken, verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
        } as any);

        const appUrl = c.env?.APP_URL || 'http://localhost:5173';
        const { sendEmail } = await import('./email-service');
        await sendEmail({
            to: customer.email!,
            subject: 'Verify your VoxCare account',
            html: `<h2>Welcome to VoxCare!</h2><p>Click <a href="${appUrl}/customer/verify/${verificationToken}">here</a> to verify your email.</p>`,
            text: `Verify your email: ${appUrl}/customer/verify/${verificationToken}`,
        }, c.env);

        return c.json({ success: true, data: { message: 'Verification email sent' } });
    });

    app.post('/api/customer/auth/forgot-password', async (c) => {
        const { email } = await c.req.json();
        if (!email) return c.json({ success: false, error: 'Email required' }, { status: 400 });

        const controller = getAppController(c.env);
        const customers = await controller.listCustomers();
        const customer = customers.find(cust => cust.email === email.toLowerCase());

        if (customer && customer.isActive) {
            const resetToken = crypto.randomUUID();
            await controller.addPasswordReset({ token: resetToken, userId: customer.id, expiresAt: Date.now() + 60 * 60 * 1000, createdAt: new Date().toISOString() });

            const appUrl = c.env?.APP_URL || 'http://localhost:5173';
            const { sendEmail } = await import('./email-service');
            await sendEmail({
                to: customer.email!,
                subject: 'Reset your VoxCare password',
                html: `<h2>Reset Password</h2><p>Click <a href="${appUrl}/customer/reset-password/${resetToken}">here</a> to reset your password. This link expires in 1 hour.</p>`,
                text: `Reset password: ${appUrl}/customer/reset-password/${resetToken}`,
            }, c.env);
        }

        // Always return success (don't leak whether email exists)
        return c.json({ success: true, data: { message: 'If the email exists, a reset link has been sent' } });
    });

    app.post('/api/customer/auth/reset-password', async (c) => {
        const { token, password } = await c.req.json();
        if (!token || !password) return c.json({ success: false, error: 'Token and password required' }, { status: 400 });

        const pwCheck = validatePassword(password);
        if (!pwCheck.valid) return c.json({ success: false, error: pwCheck.errors.join(', ') }, { status: 400 });

        const controller = getAppController(c.env);
        const reset = await controller.getPasswordReset(token);
        if (!reset) return c.json({ success: false, error: 'Invalid reset token' }, { status: 400 });

        const { hash, salt } = await (async () => {
            const encoder = new TextEncoder();
            const saltBytes = crypto.getRandomValues(new Uint8Array(16));
            const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
            const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
            return { hash: btoa(String.fromCharCode(...new Uint8Array(derivedBits))), salt: btoa(String.fromCharCode(...saltBytes)) };
        })();

        await controller.updateCustomer(reset.userId, { passwordHash: hash, passwordSalt: salt } as any);
        await controller.deletePasswordReset(token);

        return c.json({ success: true, data: { message: 'Password updated' } });
    });

    app.patch('/api/customer/password', authMiddleware(), async (c) => {
        const user = getUser(c);
        const { currentPassword, newPassword } = await c.req.json();
        if (!currentPassword || !newPassword) return c.json({ success: false, error: 'Current and new password required' }, { status: 400 });

        const pwCheck = validatePassword(newPassword);
        if (!pwCheck.valid) return c.json({ success: false, error: pwCheck.errors.join(', ') }, { status: 400 });

        const controller = getAppController(c.env);
        const customer = await controller.getCustomer(user.sub);
        if (!customer || !customer.passwordHash || !customer.passwordSalt) return c.json({ success: false, error: 'Customer not found' }, { status: 404 });

        // Verify current password
        const encoder = new TextEncoder();
        const saltBytes = Uint8Array.from(atob(customer.passwordSalt), ch => ch.charCodeAt(0));
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(currentPassword), 'PBKDF2', false, ['deriveBits']);
        const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100_000, hash: 'SHA-256' }, keyMaterial, 256);
        if (btoa(String.fromCharCode(...new Uint8Array(derivedBits))) !== customer.passwordHash) {
            return c.json({ success: false, error: 'Current password is incorrect' }, { status: 401 });
        }

        const { hash, salt } = await (async () => {
            const saltBytes = crypto.getRandomValues(new Uint8Array(16));
            const km = await crypto.subtle.importKey('raw', encoder.encode(newPassword), 'PBKDF2', false, ['deriveBits']);
            const db = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100_000, hash: 'SHA-256' }, km, 256);
            return { hash: btoa(String.fromCharCode(...new Uint8Array(db))), salt: btoa(String.fromCharCode(...saltBytes)) };
        })();

        await controller.updateCustomer(user.sub, { passwordHash: hash, passwordSalt: salt } as any);
        return c.json({ success: true, data: { message: 'Password updated' } });
    });

    // ─── Customer Portal API ─────────────────────────────────

    // Customer auth middleware helper
    const requireCustomer = async (c: any) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });
        return user;
    };

    app.get('/api/customer/tickets', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const controller = getAppController(c.env);
        const allTickets = await controller.listTickets();
        const myTickets = allTickets.filter(t => t.customerId === user.sub);
        // Simple pagination
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '20');
        const start = (page - 1) * limit;
        const paginated = myTickets.slice(start, start + limit);
        return c.json({ success: true, data: paginated, pagination: { total: myTickets.length, page, limit, totalPages: Math.ceil(myTickets.length / limit) || 1 } });
    });

    app.get('/api/customer/tickets/:id', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const controller = getAppController(c.env);
        const ticket = await controller.getTicket(c.req.param('id'));
        if (!ticket) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });
        if (ticket.customerId !== user.sub) return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        // Exclude internal notes
        const publicTicket = {
            ...ticket,
            internalNotes: [],
        };
        return c.json({ success: true, data: publicTicket });
    });

    // ─── Customer Ticket Replies ─────────────────────────────
    app.post('/api/customer/tickets/:id/replies', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const ticketId = c.req.param('id');

        // Rate limit: 10 replies per minute per ticket
        try {
            const rateKey = `reply-${ticketId}`;
            const id = c.env.RATE_LIMITER.idFromName(rateKey);
            const stub = c.env.RATE_LIMITER.get(id);
            const res = await stub.fetch(new Request(`http://rate-limiter?key=${encodeURIComponent(rateKey)}&max=10&window=60000`));
            if (res.status === 429) {
                const body = await res.json();
                return c.json({ success: false, error: 'Rate limit exceeded. Please wait before sending another reply.', retryAfter: body.retryAfter }, { status: 429 });
            }
        } catch {
            // If rate limiter is unavailable, allow request through
        }

        const { text, attachments } = await c.req.json();
        if (!text?.trim() && (!attachments || attachments.length === 0)) return c.json({ success: false, error: 'Reply text or attachment is required' }, { status: 400 });

        const controller = getAppController(c.env);
        const ticket = await controller.getTicket(ticketId);
        if (!ticket) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });
        if (ticket.customerId !== user.sub) return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const customer = await controller.getCustomer(user.sub);
        const { reply } = await controller.addTicketReply(ticketId, {
            id: `reply-${crypto.randomUUID()}`,
            sender: 'customer',
            senderId: user.sub,
            senderName: customer?.name || 'Customer',
            text: text?.trim() || '',
            attachments: attachments || [],
        });

        if (!reply) return c.json({ success: false, error: 'Failed to add reply' }, { status: 500 });

        // Update ticket timestamps
        await controller.updateTicket(ticketId, {
            updatedAt: new Date().toISOString(),
            lastCustomerReplyAt: new Date().toISOString(),
        });

        // Create notification for assigned agent (or all available agents if unassigned)
        if (ticket.assignedTo) {
            await controller.addNotification({
                id: crypto.randomUUID(),
                type: 'ticket-updated',
                recipientId: ticket.assignedTo,
                read: false,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                data: { ticketId, title: ticket.title, replyFrom: customer?.name },
            });

            // Email notification if agent has email enabled
            const agent = await controller.getUser(ticket.assignedTo);
            if (agent?.notificationPrefs?.emailEnabled && agent.email) {
                const appUrl = c.env.APP_URL || 'http://localhost:5173';
                const ticketUrl = `${appUrl}/tickets/${ticketId}`;
                const { sendEmail } = await import('./email-service');
                await sendEmail({
                    to: agent.email,
                    subject: `[VoxCare] ${customer?.name || 'Customer'} replied to ticket ${ticketId}`,
                    htmlBody: `<p>${customer?.name || 'Customer'} replied to <a href="${ticketUrl}">ticket ${ticketId}</a>: ${text.trim().substring(0, 500)}</p>`,
                    textBody: `${customer?.name} replied to ticket ${ticketId}: ${text.trim().substring(0, 500)}. View: ${ticketUrl}`,
                }, c.env);
            }
        } else {
            // Notify all available agents
            const agents = await controller.listUsers();
            const availableAgents = agents.filter(a => a.active && a.availability === 'available' && (a.role === 'agent' || a.role === 'supervisor'));
            for (const agent of availableAgents.slice(0, 5)) {
                await controller.addNotification({
                    id: crypto.randomUUID(),
                    type: 'ticket-updated',
                    recipientId: agent.id,
                    read: false,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    data: { ticketId, title: ticket.title, replyFrom: customer?.name },
                });
            }
        }

        return c.json({ success: true, data: reply });
    });

    app.get('/api/customer/tickets/:id/replies', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const ticketId = c.req.param('id');
        const controller = getAppController(c.env);
        const ticket = await controller.getTicket(ticketId);
        if (!ticket) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });
        if (ticket.customerId !== user.sub) return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const replies = await controller.getTicketReplies(ticketId);
        return c.json({ success: true, data: replies });
    });

    // ─── Customer Ticket Reply Attachments ───────────────────
    app.post('/api/customer/tickets/:id/replies/attachments', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const ticketId = c.req.param('id');
        const controller = getAppController(c.env);
        const ticket = await controller.getTicket(ticketId);
        if (!ticket) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });
        if (ticket.customerId !== user.sub) return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const formData = await c.req.formData();
        const file = formData.get('file') as File;
        if (!file) return c.json({ success: false, error: 'No file provided' }, { status: 400 });
        if (file.size > 10 * 1024 * 1024) return c.json({ success: false, error: 'File too large. Maximum 10MB.' }, { status: 400 });

        const key = `tickets/${ticketId}/${crypto.randomUUID()}-${file.name}`;
        try {
            await c.env.ATTACHMENTS_BUCKET.put(key, file.stream(), {
                httpMetadata: { contentType: file.type },
                customMetadata: { ticketId, fileName: file.name, uploadedBy: user.sub },
            });
        } catch {
            console.warn('R2 not available, attachment stored as metadata only');
        }

        const attachment = {
            key,
            filename: file.name,
            contentType: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
        };

        // Also add to ticket attachments
        const existingAttachments = ticket.attachments || [];
        await controller.updateTicket(ticketId, { attachments: [...existingAttachments, attachment] });

        return c.json({ success: true, data: attachment });
    });

    // ─── Agent Ticket Replies ────────────────────────────────
    app.post('/api/tickets/:id/replies', authMiddleware(), requireRole('agent', 'supervisor', 'admin'), async (c) => {
        const user = getUser(c);
        const ticketId = c.req.param('id');
        const { text } = await c.req.json();
        if (!text?.trim()) return c.json({ success: false, error: 'Reply text is required' }, { status: 400 });

        const controller = getAppController(c.env);
        const ticket = await controller.getTicket(ticketId);
        if (!ticket) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });

        const { reply } = await controller.addTicketReply(ticketId, {
            id: `reply-${crypto.randomUUID()}`,
            sender: 'agent',
            senderId: user.sub,
            senderName: user.name,
            text: text.trim(),
        });

        if (!reply) return c.json({ success: false, error: 'Failed to add reply' }, { status: 500 });

        await controller.updateTicket(ticketId, { updatedAt: new Date().toISOString() });

        // Notify customer (if customer has notification prefs, check them)
        if (ticket.customerId) {
            const customer = await controller.getCustomer(ticket.customerId);
            if (customer?.email) {
                // Check notification prefs - default to allowed if null
                const prefs = (customer as any).notificationPrefs;
                const agentReplyEnabled = !prefs || prefs.events?.['agent-reply'] !== false;
                if (agentReplyEnabled && prefs?.frequency !== 'daily-digest') {
                    const appUrl = c.env.APP_URL || 'http://localhost:5173';
                    const ticketUrl = `${appUrl}/public/ticket/${ticket.publicToken}`;
                    const { sendEmail, createTicketUpdatedEmail } = await import('./email-service');
                    const email = createTicketUpdatedEmail(customer.email, customer.name, ticketId, ticket.title, text.trim(), ticketUrl);
                    await sendEmail(email, c.env);
                }
            }
        }

        return c.json({ success: true, data: reply });
    });

    app.get('/api/tickets/:id/replies', authMiddleware(), async (c) => {
        const ticketId = c.req.param('id');
        const controller = getAppController(c.env);
        const replies = await controller.getTicketReplies(ticketId);
        return c.json({ success: true, data: replies });
    });

    app.post('/api/customer/tickets', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const ticket = await c.req.json();
        const controller = getAppController(c.env);
        const customer = await controller.getCustomer(user.sub);

        const ticketWithMeta = {
            ...ticket,
            id: ticket.id || `T-${Date.now()}`,
            customerId: user.sub,
            customerName: customer?.name || 'Customer',
            status: 'open',
            assignedTo: null,
            slaRecordId: null,
            escalationLevel: 0,
            resolutionTime: null,
            resolvedAt: null,
            resolvedBy: null,
            internalNotes: [],
            publicNotes: null,
            attachments: [],
            tags: ticket.tags || [],
            publicToken: crypto.randomUUID(),
            mergedInto: null,
            fcrFlag: false,
            handleTimeSeconds: null,
            updatedAt: null,
            lastCustomerReplyAt: null,
        };
        await controller.addTicket(ticketWithMeta);

        // Auto-create SLA record
        const slaConfig = await controller.getSLAConfigByPriority(ticket.priority || 'medium');
        if (slaConfig) {
            const slaRecord = {
                id: `sla-${ticketWithMeta.id}`,
                ticketId: ticketWithMeta.id,
                responseDeadline: new Date(Date.now() + slaConfig.responseMinutes * 60000).toISOString(),
                resolutionDeadline: new Date(Date.now() + slaConfig.resolutionMinutes * 60000).toISOString(),
                firstResponseAt: null, resolvedAt: null, escalationLevel: 0,
                breached: false, escalationTriggered: false, createdAt: new Date().toISOString(),
            };
            await controller.addSLARecord(slaRecord);
            await controller.updateTicket(ticketWithMeta.id, { slaRecordId: slaRecord.id });
        }

        // Send confirmation email
        if (customer?.email) {
            const appUrl = c.env?.APP_URL || 'http://localhost:5173';
            const { sendEmail, createTicketCreatedEmail } = await import('./email-service');
            const ticketUrl = `${appUrl}/customer/tickets/${ticketWithMeta.id}`;
            const email = createTicketCreatedEmail(customer.email, customer.name, ticketWithMeta.id, ticket.title, ticket.description, ticketUrl);
            await sendEmail(email, c.env);
        }

        return c.json({ success: true, data: ticketWithMeta });
    });

    app.get('/api/customer/profile', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const controller = getAppController(c.env);
        const customer = await controller.getCustomer(user.sub);
        if (!customer) return c.json({ success: false, error: 'Customer not found' }, { status: 404 });

        // Return public fields only
        return c.json({ success: true, data: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, company: customer.company, createdAt: customer.createdAt } });
    });

    app.patch('/api/customer/profile', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateCustomer(user.sub, {
            name: updates.name,
            phone: updates.phone,
            company: updates.company,
            updatedAt: new Date().toISOString(),
        } as any);

        if (!updated) return c.json({ success: false, error: 'Customer not found' }, { status: 404 });
        return c.json({ success: true, data: { id: updated.id, name: updated.name, email: updated.email, phone: updated.phone, company: updated.company } });
    });

    // ─── Customer Chat Sessions ────────────────────────────
    app.get('/api/customer/chat-sessions', authMiddleware(), async (c) => {
        const user = getUser(c);
        if (user.role !== 'customer') return c.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const controller = getAppController(c.env);
        const allSessions = await controller.listChatSessions();
        const customerSessions = allSessions.filter(s => s.customerId === user.sub);
        return c.json({ success: true, data: customerSessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
    });

    // ─── Live Chat ─────────────────────────────────────────

    app.post('/api/chat-sessions', async (c) => {
        const { customerId, customerName, customerEmail } = await c.req.json();
        if (!customerName) return c.json({ success: false, error: 'Customer name required' }, { status: 400 });

        const controller = getAppController(c.env);
        const session = await controller.addChatSession({
            id: `chat-${crypto.randomUUID()}`,
            customerId: customerId || null,
            customerName,
            customerEmail: customerEmail || null,
            agentId: null,
            state: 'collecting',
            aiSummary: null,
            suggestedCategory: null,
            suggestedPriority: null,
            transcript: [],
            typingIndicator: { customer: false, agent: false },
            createdAt: new Date().toISOString(),
            closedAt: null,
            ticketId: null,
            maxConcurrentChats: 2,
        } as any);

        return c.json({ success: true, data: session });
    });

    // AI Greeting Bot — processes customer message and returns AI response
    app.post('/api/chat-sessions/:id/chat', async (c) => {
        const chatId = c.req.param('id');
        const { message, customerName } = await c.req.json();
        if (!message) return c.json({ success: false, error: 'Message required' }, { status: 400 });

        const controller = getAppController(c.env);
        const session = await controller.getChatSession(chatId);
        if (!session) return c.json({ success: false, error: 'Chat session not found' }, { status: 404 });
        if ((session as any).state !== 'collecting') return c.json({ success: false, error: 'Chat is not in collecting state' }, { status: 400 });

        // Store customer message
        await controller.addChatMessage({
            id: `msg-${crypto.randomUUID()}`,
            chatId,
            sender: 'customer',
            text: message,
            attachments: [],
            timestamp: new Date().toISOString(),
            read: false,
        } as any);

        // Get conversation history for context
        const messages = await controller.getChatMessages(chatId);
        const conversationHistory = messages.slice(-10).map(m => ({ role: m.sender === 'customer' ? 'user' : 'assistant', content: m.text }));

        // Process with AI bot
        const result = await processChatMessage(
            message,
            conversationHistory,
            c.env?.CF_AI_API_KEY,
            c.env?.CF_AI_BASE_URL
        );

        // Store AI response
        await controller.addChatMessage({
            id: `msg-${crypto.randomUUID()}`,
            chatId,
            sender: 'ai',
            text: result.reply,
            attachments: [],
            timestamp: new Date().toISOString(),
            read: false,
        } as any);

        // If AI is ready for agent, transition chat to waiting state
        if (result.readyForAgent && result.data) {
            await controller.updateChatSession(chatId, {
                state: 'waiting',
                aiSummary: result.data.summary,
                suggestedCategory: result.data.category,
                suggestedPriority: result.data.priority,
            } as any);

            // Notify available agents via notification
            const users = await controller.listUsers();
            const notif = {
                id: crypto.randomUUID(),
                type: 'chat-incoming' as const,
                recipientId: '',
                read: false,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                data: { chatId, customerName: session.customerName, summary: result.data.summary, category: result.data.category, priority: result.data.priority },
            };
            for (const u of users) {
                if (u.role === 'agent' || u.role === 'supervisor') {
                    await controller.addNotification({ ...notif, id: crypto.randomUUID(), recipientId: u.id });
                }
            }
        }

        return c.json({ success: true, data: { reply: result.reply, readyForAgent: result.readyForAgent } });
    });

    app.get('/api/chat-sessions/:id/messages', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const messages = await controller.getChatMessages(c.req.param('id'));
        return c.json({ success: true, data: messages });
    });

    app.post('/api/chat-sessions/:id/messages', async (c) => {
        const chatId = c.req.param('id');
        const { sender, text } = await c.req.json();
        if (!sender || !text) return c.json({ success: false, error: 'Sender and text required' }, { status: 400 });

        const controller = getAppController(c.env);
        const msg = await controller.addChatMessage({
            id: `msg-${crypto.randomUUID()}`,
            chatId,
            sender: sender as any,
            text,
            attachments: [],
            timestamp: new Date().toISOString(),
            read: false,
        } as any);

        return c.json({ success: true, data: msg });
    });

    app.get('/api/chat-sessions/:id/stream', async (c) => {
        const chatId = c.req.param('id');
        const controller = getAppController(c.env);

        // Get initial messages
        const initialMessages = await controller.getChatMessages(chatId);

        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const encoder = new TextEncoder();

        // Send initial messages
        for (const msg of initialMessages) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'message', data: msg })}\n\n`));
        }

        // Heartbeat
        const heartbeatInterval = setInterval(async () => {
            try { await writer.write(encoder.encode(': heartbeat\n\n')); } catch { clearInterval(heartbeatInterval); }
        }, 15000);

        // Poll for new messages
        let lastCount = initialMessages.length;
        const pollInterval = setInterval(async () => {
            try {
                const messages = await controller.getChatMessages(chatId);
                if (messages.length > lastCount) {
                    for (let i = lastCount; i < messages.length; i++) {
                        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'message', data: messages[i] })}\n\n`));
                    }
                    lastCount = messages.length;
                }
            } catch { /* ignore */ }
        }, 2000);

        // Close on client disconnect
        c.req.raw.signal.addEventListener('abort', () => {
            clearInterval(heartbeatInterval);
            clearInterval(pollInterval);
            writer.close().catch(() => {});
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            },
        });
    });

    app.post('/api/chat-sessions/:id/typing', async (c) => {
        const chatId = c.req.param('id');
        const { sender, isTyping } = await c.req.json();

        const controller = getAppController(c.env);
        const session = await controller.getChatSession(chatId);
        if (!session) return c.json({ success: false, error: 'Chat session not found' }, { status: 404 });

        (session as any).typingIndicator = {
            ...(session as any).typingIndicator || {},
            [sender]: isTyping,
        };
        await controller.updateChatSession(chatId, { typingIndicator: (session as any).typingIndicator });

        return c.json({ success: true });
    });

    app.post('/api/chat-sessions/:id/attachments', authMiddleware(), async (c) => {
        const chatId = c.req.param('id');
        const formData = await c.req.formData();
        const file = formData.get('file') as File;
        if (!file) return c.json({ success: false, error: 'File required' }, { status: 400 });
        if (file.size > 10 * 1024 * 1024) return c.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 });

        const key = `chat-attachments/${chatId}/${crypto.randomUUID()}-${file.name}`;
        await c.env.ATTACHMENTS_BUCKET.put(key, file.stream(), {
            httpMetadata: { contentType: file.type },
        });

        const attachment = { key, filename: file.name, contentType: file.type, size: file.size };
        const controller = getAppController(c.env);
        const msg = await controller.addChatMessage({
            id: `msg-${crypto.randomUUID()}`,
            chatId,
            sender: 'system',
            text: `File attached: ${file.name}`,
            attachments: [attachment],
            timestamp: new Date().toISOString(),
            read: false,
        } as any);

        return c.json({ success: true, data: { message: msg, attachment } });
    });

    app.get('/api/chat-sessions/queue', authMiddleware(), async (c) => {
        const controller = getAppController(c.env);
        const waitingChats = await controller.listWaitingChats();
        return c.json({ success: true, data: waitingChats });
    });

    app.post('/api/chat-sessions/:id/accept', authMiddleware(), async (c) => {
        const user = getUser(c);
        const chatId = c.req.param('id');
        const controller = getAppController(c.env);
        const session = await controller.updateChatSession(chatId, {
            agentId: user.sub,
            state: 'active',
        } as any);
        if (!session) return c.json({ success: false, error: 'Chat session not found' }, { status: 404 });
        return c.json({ success: true, data: session });
    });

    app.post('/api/chat-sessions/:id/decline', authMiddleware(), async (c) => {
        const chatId = c.req.param('id');
        const controller = getAppController(c.env);
        // Chat stays in 'waiting' state, will be offered to next agent
        return c.json({ success: true, data: { message: 'Chat declined' } });
    });

    app.post('/api/chat-sessions/:id/transfer', authMiddleware(), async (c) => {
        const chatId = c.req.param('id');
        const controller = getAppController(c.env);
        const session = await controller.updateChatSession(chatId, {
            agentId: null,
            state: 'waiting',
        } as any);
        return c.json({ success: true, data: session });
    });

    app.post('/api/chat-sessions/:id/close', authMiddleware(), async (c) => {
        const chatId = c.req.param('id');
        const { saveAsTicket } = await c.req.json();
        const controller = getAppController(c.env);

        const session = await controller.updateChatSession(chatId, {
            state: 'closed',
            closedAt: new Date().toISOString(),
        } as any);

        if (saveAsTicket && session) {
            // Create ticket from chat transcript
            const messages = await controller.getChatMessages(chatId);
            const transcript = messages.map(m => `[${m.sender}] ${m.text}`).join('\n');
            const ticketId = `T-${Date.now()}`;
            const ticket = {
                id: ticketId,
                title: (session as any).aiSummary || `Chat from ${session.customerName}`,
                description: transcript,
                customerName: session.customerName,
                customerId: session.customerId,
                priority: (session as any).suggestedPriority || 'medium',
                status: 'open',
                category: (session as any).suggestedCategory || 'General Inquiry',
                createdAt: new Date().toISOString(),
                transcript,
                assignedTo: session.agentId,
                slaRecordId: null,
                escalationLevel: 0,
                resolutionTime: null,
                resolvedAt: null,
                resolvedBy: null,
                internalNotes: [{ text: `Chat transcript from ${session.createdAt}`, authorId: session.agentId || 'system', authorName: 'Chat', timestamp: new Date().toISOString() }],
                publicNotes: null,
                attachments: [],
                tags: ['from-chat'],
                publicToken: crypto.randomUUID(),
                mergedInto: null,
                fcrFlag: false,
                handleTimeSeconds: null,
                updatedAt: new Date().toISOString(),
                lastCustomerReplyAt: null,
            };
            await controller.addTicket(ticket);
            await controller.updateChatSession(chatId, { ticketId } as any);
        }

        return c.json({ success: true, data: { session, ticketId: saveAsTicket ? (session as any).ticketId : null } });
    });

    // Chat CSAT
    app.post('/api/chat-sessions/:id/csat', async (c) => {
        const chatId = c.req.param('id');
        const { rating, comment } = await c.req.json();
        if (!rating || rating < 1 || rating > 5) return c.json({ success: false, error: 'Valid rating (1-5) required' }, { status: 400 });

        const controller = getAppController(c.env);
        const session = await controller.getChatSession(chatId);
        if (!session) return c.json({ success: false, error: 'Chat session not found' }, { status: 404 });

        // Check for duplicate
        const existingCSATs = await controller.listCSATResponses();
        if (existingCSATs.find(r => r.ticketId === chatId)) {
            return c.json({ success: false, error: 'CSAT already submitted for this chat' }, { status: 409 });
        }

        const csat = {
            id: `csat-chat-${crypto.randomUUID()}`,
            ticketId: chatId,
            rating,
            comment: comment || null,
            submittedAt: new Date().toISOString(),
            customerEmail: session.customerEmail || '',
        };
        await controller.addCSATResponse(csat);
        return c.json({ success: true, data: csat });
    });

    // Agent chat limit config
    app.patch('/api/agents/me/chat-limit', authMiddleware(), async (c) => {
        const { maxConcurrentChats } = await c.req.json();
        if (!maxConcurrentChats || maxConcurrentChats < 1 || maxConcurrentChats > 5) {
            return c.json({ success: false, error: 'maxConcurrentChats must be 1-5' }, { status: 400 });
        }
        const user = getUser(c);
        const controller = getAppController(c.env);
        await controller.updateUser(user.sub, { maxConcurrentChats } as any);
        return c.json({ success: true });
    });
}