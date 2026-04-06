import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';

export interface ActivityEntry {
  type: 'status-change' | 'note' | 'assignment' | 'sla-event' | 'email' | 'attachment' | 'merge' | 'relation' | 'other';
  event: string;
  date: string;
  color?: string;
  icon?: any;
}

interface ActivityFilterProps {
  entries: ActivityEntry[];
  renderEntry: (entry: ActivityEntry, index: number) => React.ReactNode;
}

const EVENT_TYPES: { key: ActivityEntry['type']; label: string; color: string }[] = [
  { key: 'status-change', label: 'Status Changes', color: 'bg-blue-500' },
  { key: 'note', label: 'Notes', color: 'bg-amber-500' },
  { key: 'assignment', label: 'Assignments', color: 'bg-indigo-500' },
  { key: 'sla-event', label: 'SLA Events', color: 'bg-red-500' },
  { key: 'email', label: 'Emails', color: 'bg-green-500' },
  { key: 'attachment', label: 'Attachments', color: 'bg-purple-500' },
  { key: 'merge', label: 'Merges', color: 'bg-pink-500' },
  { key: 'relation', label: 'Relations', color: 'bg-cyan-500' },
];

export function ActivityFilter({ entries, renderEntry }: ActivityFilterProps) {
  const [activeFilters, setActiveFilters] = useState<ActivityEntry['type'][]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const filteredEntries = useMemo(() => {
    if (activeFilters.length === 0) return entries;
    return entries.filter(e => activeFilters.includes(e.type));
  }, [entries, activeFilters]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    entries.forEach(e => { c[e.type] = (c[e.type] || 0) + 1; });
    return c;
  }, [entries]);

  const toggleFilter = (type: ActivityEntry['type']) => {
    setActiveFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const clearAll = () => setActiveFilters([]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-600"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Filter className="h-4 w-4" /> Filter Activity
        </button>
        {activeFilters.length > 0 && (
          <Button size="sm" variant="ghost" className="text-xs" onClick={clearAll}>Clear all</Button>
        )}
      </div>
      {!collapsed && (
        <div className="flex flex-wrap gap-2 mb-3">
          {EVENT_TYPES.filter(t => counts[t.key] > 0).map(t => (
            <div key={t.key} className="flex items-center gap-1.5">
              <Checkbox
                id={`filter-${t.key}`}
                checked={activeFilters.length === 0 || activeFilters.includes(t.key)}
                onCheckedChange={() => toggleFilter(t.key)}
              />
              <label htmlFor={`filter-${t.key}`} className="text-xs flex items-center gap-1 cursor-pointer">
                <span className={`h-2 w-2 rounded-full ${t.color}`} />
                {t.label} ({counts[t.key] || 0})
              </label>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry, i) => renderEntry(entry, i))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No matching activity entries</p>
        )}
      </div>
    </div>
  );
}
