import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Check, X, ArrowUpRight, Trash2, Loader2, Merge } from 'lucide-react';
import { MergeTicketsDialog } from './MergeTicketsDialog';
import { BulkEmailDialog } from './BulkEmailDialog';
import { apiPost } from '@/lib/apiClient';
import { toast } from 'sonner';

interface BulkActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  tickets?: { id: string; title: string; customerName: string; customerId: string | null }[];
  onClear: () => void;
  onStatusChange: (status: string) => Promise<void>;
  onAssign: (agentId: string) => Promise<void>;
  onPriorityChange: (priority: string) => Promise<void>;
  onDelete: () => Promise<void>;
  agents?: { id: string; name: string }[];
}

export function BulkActionBar({
  selectedCount,
  selectedIds = [],
  tickets = [],
  onClear,
  onStatusChange,
  onAssign,
  onPriorityChange,
  onDelete,
  agents = [],
}: BulkActionBarProps) {
  const [action, setAction] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const handleAction = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setAction(null);
        onClear();
      }, 1000);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <>
      {/* Floating action bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4 animate-fade-in">
        <Badge variant="secondary" className="bg-white/20 text-white border-none font-bold">
          {selectedCount} selected
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 h-8"
          onClick={() => setAction('status')}
        >
          <Check className="size-3.5 mr-1" /> Status
        </Button>
        {agents.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 h-8"
            onClick={() => setAction('assign')}
          >
            <ArrowUpRight className="size-3.5 mr-1" /> Assign
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/10 h-8"
          onClick={() => setAction('priority')}
        >
          Priority
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-400 hover:bg-red-500/20 h-8"
          onClick={() => handleAction(onDelete)}
        >
          <Trash2 className="size-3.5 mr-1" /> Delete
        </Button>
        {selectedCount >= 2 && (
          <MergeTicketsDialog
            trigger={
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8">
                <Merge className="size-3.5 mr-1" /> Merge
              </Button>
            }
            ticketId={selectedIds[0]}
          />
        )}
        {selectedCount > 0 && (
          <BulkEmailDialog
            ticketIds={selectedIds}
            tickets={selectedIds.map(id => {
              const t = tickets.find(tk => tk.id === id);
              return t ? { id: t.id, title: t.title, customerName: t.customerName, customerEmail: '', status: '' } : { id, title: '', customerName: '', customerEmail: '', status: '' };
            })}
            trigger={
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-8">
                <Mail className="size-3.5 mr-1" /> Email
              </Button>
            }
          />
        )}
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8" onClick={onClear}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Status dialog */}
      <Dialog open={action === 'status'} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Status</DialogTitle></DialogHeader>
          {success ? (
            <p className="text-center text-sm text-emerald-600 py-4">✓ Updated {selectedCount} tickets</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {['open', 'in-progress', 'resolved'].map(s => (
                <Button key={s} variant="outline" className="capitalize" onClick={() => handleAction(() => onStatusChange(s))} disabled={loading}>
                  {loading && <Loader2 className="size-3 mr-1 animate-spin" />} {s}
                </Button>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={action === 'assign'} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign to Agent</DialogTitle></DialogHeader>
          {success ? (
            <p className="text-center text-sm text-emerald-600 py-4">✓ Assigned {selectedCount} tickets</p>
          ) : (
            <div className="space-y-2">
              {agents.map(a => (
                <Button key={a.id} variant="outline" className="w-full justify-start" onClick={() => handleAction(() => onAssign(a.id))} disabled={loading}>
                  {loading && <Loader2 className="size-3 mr-1 animate-spin" />} {a.name}
                </Button>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority dialog */}
      <Dialog open={action === 'priority'} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Priority</DialogTitle></DialogHeader>
          {success ? (
            <p className="text-center text-sm text-emerald-600 py-4">✓ Updated {selectedCount} tickets</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {['low', 'medium', 'high', 'urgent'].map(p => (
                <Button key={p} variant="outline" className="capitalize" onClick={() => handleAction(() => onPriorityChange(p))} disabled={loading}>
                  {loading && <Loader2 className="size-3 mr-1 animate-spin" />} {p}
                </Button>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setAction(null)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
