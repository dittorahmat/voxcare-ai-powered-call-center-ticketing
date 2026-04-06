import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { apiPost } from '@/lib/apiClient';
import { useTicketStore } from '@/store/ticketStore';
import { toast } from 'sonner';
import { Merge, Search, Ticket } from 'lucide-react';

interface MergeTicketsDialogProps {
  ticketId?: string;
  trigger?: React.ReactNode;
}

export function MergeTicketsDialog({ ticketId: initialTicketId, trigger }: MergeTicketsDialogProps) {
  const [open, setOpen] = useState(false);
  const [primaryId, setPrimaryId] = useState(initialTicketId || '');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const { tickets } = useTicketStore();

  const handleSearch = (q: string) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    const filtered = tickets.filter(t =>
      t.id.toLowerCase().includes(q.toLowerCase()) ||
      t.title.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 10);
    setResults(filtered);
  };

  const toggleSource = (id: string) => {
    setSourceIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleMerge = async () => {
    if (!primaryId || sourceIds.length === 0) {
      toast.error('Select a primary ticket and at least one source ticket');
      return;
    }
    try {
      await apiPost(`/api/tickets/${primaryId}/merge`, { sourceTicketIds: sourceIds });
      toast.success(`Merged ${sourceIds.length} tickets into ${primaryId}`);
      setOpen(false);
      setSourceIds([]);
      setSearch('');
    } catch {
      toast.error('Failed to merge tickets');
    }
  };

  const content = (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Merge className="h-5 w-5" /> Merge Tickets</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Primary Ticket (keeps all data)</label>
          <Input
            value={primaryId}
            onChange={e => setPrimaryId(e.target.value)}
            placeholder="Enter ticket ID (e.g. T-1001)"
          />
          {primaryId && tickets.find(t => t.id === primaryId) && (
            <div className="mt-2 p-2 bg-green-50 rounded text-sm">
              <Ticket className="h-3 w-3 inline mr-1" />
              {tickets.find(t => t.id === primaryId)?.title}
            </div>
          )}
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Source Tickets (will be merged into primary)</label>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search tickets..." className="pl-8" />
          </div>
          {results.length > 0 && (
            <div className="border rounded max-h-32 overflow-auto">
              {results.filter(t => t.id !== primaryId).map(t => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 border-b last:border-0">
                  <Checkbox checked={sourceIds.includes(t.id)} onCheckedChange={() => toggleSource(t.id)} />
                  <span className="text-sm font-mono text-muted-foreground">#{t.id}</span>
                  <span className="text-sm flex-1 truncate">{t.title}</span>
                  <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
          {sourceIds.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">{sourceIds.length} source ticket(s) selected</div>
          )}
        </div>
        <Button onClick={handleMerge} disabled={!primaryId || sourceIds.length === 0} className="w-full">
          <Merge className="h-4 w-4 mr-2" />
          Merge {sourceIds.length > 0 ? `(${sourceIds.length})` : ''} into {primaryId || '...'}
        </Button>
      </div>
    </DialogContent>
  );

  if (trigger) {
    return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{trigger}</DialogTrigger>{content}</Dialog>;
  }
  return <Dialog open={open} onOpenChange={setOpen}>{content}</Dialog>;
}
