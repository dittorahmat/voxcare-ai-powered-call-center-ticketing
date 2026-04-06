import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface KeyboardShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutEntry {
  keys: string;
  description: string;
}

const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'Cmd+K / Ctrl+K', description: 'Open command palette' },
  { keys: '?', description: 'Show this help dialog' },
];

const TICKET_LIST_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'j', description: 'Move selection down' },
  { keys: 'k', description: 'Move selection up' },
  { keys: 'Enter', description: 'Open selected ticket' },
  { keys: 'e', description: 'Edit selected ticket' },
  { keys: 'a', description: 'Assign selected ticket' },
  { keys: 'x', description: 'Select/deselect current ticket' },
];

const TICKET_DETAIL_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'r', description: 'Add public reply/note' },
  { keys: 'i', description: 'Add internal note' },
  { keys: 'Ctrl+Enter', description: 'Save/submit note' },
  { keys: 'Escape', description: 'Close dialog/modal' },
];

function ShortcutRow({ shortcut }: { shortcut: ShortcutEntry }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm">{shortcut.description}</span>
      <div className="flex gap-1">
        {shortcut.keys.split('/').map((k, i) => (
          <Badge key={i} variant="secondary" className="font-mono text-xs">
            {k.trim()}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function KeyboardShortcutsHelpDialog({ open, onOpenChange }: KeyboardShortcutsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Global</h4>
            {GLOBAL_SHORTCUTS.map(s => <ShortcutRow key={s.keys} shortcut={s} />)}
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2">Ticket List</h4>
            {TICKET_LIST_SHORTCUTS.map(s => <ShortcutRow key={s.keys} shortcut={s} />)}
          </div>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2">Ticket Detail</h4>
            {TICKET_DETAIL_SHORTCUTS.map(s => <ShortcutRow key={s.keys} shortcut={s} />)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
