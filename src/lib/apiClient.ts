/**
 * Centralized API client with automatic auth headers and error handling.
 * Replaces all duplicated authFetch patterns across the codebase.
 */

const API_BASE = '';

type FetchInit = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Token expired — clear tokens and redirect to login if not already there
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Only redirect if we're not already on a login/public page to avoid loops
    const path = window.location.pathname;
    if (!path.includes('/login') && !path.includes('/public/') && !path.includes('/kb')) {
      window.location.href = '/login?redirect=' + encodeURIComponent(path);
    }
    throw new Error('Unauthorized');
  }
  if (response.status === 403) {
    throw new Error('Forbidden: You do not have permission to perform this action.');
  }
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body.error) errorMessage = body.error;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export async function apiGet<T>(url: string, init?: FetchInit): Promise<T> {
  const response = await fetch(API_BASE + url, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers || {}) },
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(url: string, body?: unknown, init?: FetchInit): Promise<T> {
  const response = await fetch(API_BASE + url, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(init?.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPatch<T>(url: string, body?: unknown, init?: FetchInit): Promise<T> {
  const response = await fetch(API_BASE + url, {
    ...init,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(init?.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(url: string, body?: unknown, init?: FetchInit): Promise<T> {
  const response = await fetch(API_BASE + url, {
    ...init,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(init?.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiDelete<T>(url: string, init?: FetchInit): Promise<T> {
  const response = await fetch(API_BASE + url, {
    ...init,
    method: 'DELETE',
    headers: { ...getAuthHeaders(), ...(init?.headers || {}) },
  });
  return handleResponse<T>(response);
}

// ─── Tag Helpers ─────────────────────────────────────────────────
export async function apiGetAllTags(): Promise<{ name: string; count: number }[]> {
  const res = await apiGet<{ success: boolean; data: { name: string; count: number }[] }>('/api/tags');
  return res.success ? res.data : [];
}

// ─── Ticket Relation Helpers ───────────────────────────────────
export async function apiPostRelation(ticketId: string, relatedId: string, type: 'parent-child' | 'related' = 'related') {
  return apiPost('/api/ticket-relations', { ticketA: ticketId, ticketB: relatedId, type });
}

export async function apiDeleteRelation(id: string) {
  return apiDelete('/api/ticket-relations/' + id);
}

export async function apiGetTicketRelations(ticketId: string) {
  return apiGet(`/api/ticket-relations?ticketId=${ticketId}`);
}
