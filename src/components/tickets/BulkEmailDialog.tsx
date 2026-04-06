import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Mail, Users } from 'lucide-react';
import { apiPost } from '@/lib/apiClient';
import { toast } from 'sonner';

interface BulkEmailDialogProps {
  ticketIds: string[];
  tickets: { id: string; title: string; customerName: string; customerEmail: string; status: string }[];
  trigger?: React.ReactNode;
}

export function BulkEmailDialog({ ticketIds, tickets, trigger }: BulkEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const validTickets = tickets.filter(t => t.customerEmail);

  const handleSend = async () => {
    setSending(true);
    try {
      await apiPost('/api/tickets/bulk-email', {
        ticketIds: validTickets.map(t => t.id),
        message,
      });
      toast.success(`Emails sent to ${validTickets.length} customers`);
      setOpen(false);
      setMessage('');
    } catch {
      toast.error('Failed to send bulk emails');
    } finally {
      setSending(false);
    }
  };

  const content = (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" /> Email Customers ({validTickets.length})
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Recipients:</p>
          <div className="max-h-32 overflow-auto space-y-1">
            {validTickets.map(t => (
              <div key={t.id} className="flex items-center justify-between text-sm py-1 px-2 bg-slate-50 rounded">
                <span className="truncate flex-1">{t.customerName} ({t.customerEmail})</span>
                <Badge variant="outline" className="text-[10px] ml-2">#{t.id}</Badge>
              </div>
            ))}
          </div>
          {validTickets.length === 0 && (
            <p className="text-sm text-muted-foreground">No tickets with customer email addresses.</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Message (optional)</label>
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Add a personal message..."
            className="min-h-[100px]"
          />
        </div>
        <Button onClick={handleSend} disabled={sending || validTickets.length === 0} className="w-full">
          {sending ? 'Sending...' : <><Mail className="h-4 w-4 mr-2" /> Send to {validTickets.length} Customer(s)</>}
        </Button>
      </div>
    </DialogContent>
  );

  if (trigger) {
    return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{trigger}</DialogTrigger>{content}</Dialog>;
  }
  return <Dialog open={open} onOpenChange={setOpen}>{content}</Dialog>;
}
