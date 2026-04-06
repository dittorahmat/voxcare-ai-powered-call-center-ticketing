import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiPost } from '@/lib/apiClient';
import { toast } from 'sonner';
import { BookmarkPlus } from 'lucide-react';

interface SaveViewDialogProps {
  trigger?: React.ReactNode;
  currentFilters: Record<string, unknown>;
  currentSort: { field: string; order: 'asc' | 'desc' } | null;
  onSuccess?: () => void;
}

export function SaveViewDialog({ trigger, currentFilters, currentSort, onSuccess }: SaveViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('View name is required'); return; }
    try {
      await apiPost('/api/views', {
        name: name.trim(),
        filters: currentFilters,
        sort: currentSort,
        isDefault,
      });
      toast.success('View saved');
      setOpen(false);
      setName('');
      onSuccess?.();
    } catch {
      toast.error('Failed to save view');
    }
  };

  const content = (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><BookmarkPlus className="h-5 w-5" /> Save Ticket View</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>View Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My High Priority Tickets" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Make Default</Label>
            <p className="text-xs text-muted-foreground">Visible to all users</p>
          </div>
          <Switch checked={isDefault} onCheckedChange={setIsDefault} />
        </div>
        <Button onClick={handleSave} className="w-full">
          <BookmarkPlus className="h-4 w-4 mr-2" /> Save View
        </Button>
      </div>
    </DialogContent>
  );

  if (trigger) {
    return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{trigger}</DialogTrigger>{content}</Dialog>;
  }
  return <Dialog open={open} onOpenChange={setOpen}>{content}</Dialog>;
}
