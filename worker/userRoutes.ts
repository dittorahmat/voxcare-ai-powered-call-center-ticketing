import { Hono } from "hono";
import { getAgentByName } from 'agents';
import { ChatAgent } from './agent';
import { API_RESPONSES } from './config';
import { Env, getAppController, registerSession, unregisterSession } from "./core-utils";
export function coreRoutes(app: Hono<{ Bindings: Env }>) {
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
    // Ticket Management Routes
    app.get('/api/tickets', async (c) => {
        const controller = getAppController(c.env);
        const tickets = await controller.listTickets();
        return c.json({ success: true, data: tickets });
    });
    app.post('/api/tickets', async (c) => {
        const ticket = await c.req.json();
        const controller = getAppController(c.env);
        await controller.addTicket(ticket);
        return c.json({ success: true, data: ticket });
    });
    app.patch('/api/tickets/:id', async (c) => {
        const id = c.req.param('id');
        const updates = await c.req.json();
        const controller = getAppController(c.env);
        const updated = await controller.updateTicket(id, updates);
        if (!updated) return c.json({ success: false, error: 'Ticket not found' }, { status: 404 });
        return c.json({ success: true, data: updated });
    });
    app.delete('/api/tickets/:id', async (c) => {
        const id = c.req.param('id');
        const controller = getAppController(c.env);
        const deleted = await controller.deleteTicket(id);
        return c.json({ success: true, data: { deleted } });
    });
    // Session Routes
    app.get('/api/sessions', async (c) => {
        const controller = getAppController(c.env);
        const sessions = await controller.listSessions();
        return c.json({ success: true, data: sessions });
    });
    app.post('/api/sessions', async (c) => {
        const { title, sessionId: pid, firstMessage } = await c.req.json().catch(() => ({}));
        const sessionId = pid || crypto.randomUUID();
        let sessionTitle = title || (firstMessage ? firstMessage.slice(0, 30) : `Chat ${new Date().toLocaleDateString()}`);
        await registerSession(c.env, sessionId, sessionTitle);
        return c.json({ success: true, data: { sessionId, title: sessionTitle } });
    });
    app.delete('/api/sessions/:sessionId', async (c) => {
        const sessionId = c.req.param('sessionId');
        const deleted = await unregisterSession(c.env, sessionId);
        return c.json({ success: true, data: { deleted } });
    });
}