import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { BulkEmailDialog } from './BulkEmailDialog';
import { useTicketStore } from '@/store/ticketStore';

interface BulkEmailButtonProps {
  selectedIds: string[];
}

export function BulkEmailButton({ selectedIds }: BulkEmailButtonProps) {
  const tickets = useTicketStore(s => s.tickets);
  const selectedTickets = tickets.filter(t => selectedIds.includes(t.id));

  if (selectedIds.length === 0) return null;

  return (
    <BulkEmailDialog
      ticketIds={selectedIds}
      tickets={selectedTickets.map(t => ({
        id: t.id,
        title: t.title,
        customerName: t.customerName,
        customerEmail: t.customerId ? '' : '', // Would need customer lookup
        status: t.status,
      }))}
      trigger={
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8">
          <Mail className="size-3.5 mr-1" /> Email
        </Button>
      }
    />
  );
}
