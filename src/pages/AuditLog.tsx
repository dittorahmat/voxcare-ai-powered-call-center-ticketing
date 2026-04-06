import React, { useState, useEffect } from 'react';
import { apiGet } from '@/lib/apiClient';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Filter, Plus, Pencil, Trash2, CheckCircle2, UserCog } from 'lucide-react';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  action: string;
  userName: string;
  userRole: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <Plus className="size-3.5 text-emerald-600" />,
  updated: <Pencil className="size-3.5 text-blue-600" />,
  deleted: <Trash2 className="size-3.5 text-red-600" />,
  resolved: <CheckCircle2 className="size-3.5 text-emerald-600" />,
  assigned: <UserCog className="size-3.5 text-indigo-600" />,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  updated: 'bg-blue-50 text-blue-700 border-blue-200',
  deleted: 'bg-red-50 text-red-700 border-red-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  assigned: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('');

  useEffect(() => { load(); }, [entityType]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      const res = await apiGet<{ success: boolean; data: AuditEntry[] }>(`/api/audit?${params}`);
      setEntries((res.data || []).slice(0, 100));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="size-7 text-indigo-600" /> Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">Track all system changes and user actions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="ticket">Tickets</SelectItem>
              <SelectItem value="user">Users</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">No audit entries found</div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-slate-50">
                {entries.map(e => (
                  <div key={e.id} className="p-4 px-6 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        {ACTION_ICONS[e.action] || <FileText className="size-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] capitalize ${ACTION_COLORS[e.action] || ''}`}>
                            {e.action}
                          </Badge>
                          <span className="text-sm font-medium text-slate-900">
                            {e.entityType} #{e.entityId}
                          </span>
                          <span className="text-xs text-muted-foreground">by {e.userName} ({e.userRole})</span>
                        </div>
                        {e.changes && Object.keys(e.changes).length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground font-mono">
                            {Object.entries(e.changes).slice(0, 3).map(([key, val]) => (
                              <span key={key} className="mr-3">
                                {key}: <span className="text-red-500 line-through">{JSON.stringify(val.before)}</span>
                                {' → '}
                                <span className="text-emerald-600">{JSON.stringify(val.after)}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {format(new Date(e.timestamp), 'MMM d, p')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
