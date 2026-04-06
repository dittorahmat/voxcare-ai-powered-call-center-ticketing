import { create } from 'zustand';
import type { Ticket, TicketPriority, TicketStatus } from '../../worker/types';
import { apiGet, apiPost, apiPatch } from '@/lib/apiClient';
interface TicketState {
  tickets: Ticket[];
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  addTicket: (ticket: Ticket) => Promise<void>;
  updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
}
export const useTicketStore = create<TicketState>((set, get) => ({
  tickets: [],
  isLoading: true,
  error: null,
  initialize: async () => {
    set({ error: null });
    try {
      const json = await apiGet<{ success: boolean; data: Ticket[] }>('/api/tickets');
      if (json.success) {
        set({ tickets: json.data, isLoading: false, error: null });
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      if (err.message === 'Unauthorized') {
        set({ isLoading: false, error: null, tickets: [] });
        return;
      }
      set({ error: err.message, isLoading: false });
    }
  },
  addTicket: async (ticket) => {
    const prevState = get();
    set({ tickets: [ticket, ...prevState.tickets] }); // Optimistic
    try {
      await apiPost('/api/tickets', ticket);
    } catch (err) {
      set(prevState); // Rollback
    }
  },
  updateTicketStatus: async (id, status) => {
    const prevState = get();
    set({ tickets: prevState.tickets.map(t => t.id === id ? { ...t, status } : t) });
    try {
      await apiPatch(`/api/tickets/${id}`, { status });
    } catch (err) {
      set(prevState);
    }
  },
  updateTicket: async (id, updates) => {
    const prevState = get();
    set({ tickets: prevState.tickets.map(t => t.id === id ? { ...t, ...updates } : t) });
    try {
      await apiPatch(`/api/tickets/${id}`, updates);
    } catch (err) {
      set(prevState);
    }
  },
}));