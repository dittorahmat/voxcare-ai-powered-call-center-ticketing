import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export interface Ticket {
  id: string;
  title: string;
  description: string;
  customerName: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  createdAt: string;
  transcript?: string;
}
interface TicketState {
  tickets: Ticket[];
  addTicket: (ticket: Ticket) => void;
  updateTicketStatus: (id: string, status: TicketStatus) => void;
}
const MOCK_TICKETS: Ticket[] = [
  {
    id: 'T-1001',
    title: 'Internet Connection Dropping',
    description: 'Customer reporting intermittent connectivity issues in the North region.',
    customerName: 'Sarah Jenkins',
    priority: 'high',
    status: 'open',
    category: 'Technical Support',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'T-1002',
    title: 'Billing Discrepancy - April',
    description: 'Overcharged by $15 on the latest monthly subscription invoice.',
    customerName: 'Michael Chen',
    priority: 'medium',
    status: 'in-progress',
    category: 'Billing',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'T-1003',
    title: 'Feature Request: Dark Mode',
    description: 'User suggests adding a native dark mode to the mobile application.',
    customerName: 'Alex Rivera',
    priority: 'low',
    status: 'open',
    category: 'Feedback',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'T-1004',
    title: 'Account Locked - 3 Attempts',
    description: 'User locked out after multiple failed password attempts.',
    customerName: 'Emma Wilson',
    priority: 'urgent',
    status: 'resolved',
    category: 'Security',
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'T-1005',
    title: 'New Service Installation',
    description: 'Scheduled fiber optic installation for new residential customer.',
    customerName: 'David Miller',
    priority: 'medium',
    status: 'in-progress',
    category: 'Service',
    createdAt: new Date(Date.now() - 18000000).toISOString(),
  }
];
export const useTicketStore = create<TicketState>()(
  persist(
    (set) => ({
      tickets: MOCK_TICKETS,
      addTicket: (ticket) => set((state) => ({ 
        tickets: [ticket, ...state.tickets] 
      })),
      updateTicketStatus: (id, status) => set((state) => ({
        tickets: state.tickets.map(t => t.id === id ? { ...t, status } : t)
      })),
    }),
    { name: 'voxcare-tickets' }
  )
);