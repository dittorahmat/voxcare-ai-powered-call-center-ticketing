import { create } from 'zustand';
import type { Ticket, TicketPriority, TicketStatus } from '../../worker/types';
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
  isLoading: false,
  error: null,
  initialize: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/tickets');
      const json = await res.json();
      if (json.success) {
        set({ tickets: json.data, isLoading: false });
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  addTicket: async (ticket) => {
    const prev = get().tickets;
    set({ tickets: [ticket, ...prev] }); // Optimistic
    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket)
      });
    } catch (err) {
      set({ tickets: prev }); // Rollback
    }
  },
  updateTicketStatus: async (id, status) => {
    const prev = get().tickets;
    set({ tickets: prev.map(t => t.id === id ? { ...t, status } : t) });
    try {
      await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      set({ tickets: prev });
    }
  },
  updateTicket: async (id, updates) => {
    const prev = get().tickets;
    set({ tickets: prev.map(t => t.id === id ? { ...t, ...updates } : t) });
    try {
      await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      set({ tickets: prev });
    }
  },
}));