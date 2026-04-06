import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTicketStore } from '@/store/ticketStore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Inbox, ExternalLink, Plus, Clock, Tag, Filter, Bookmark, BookmarkCheck, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';
import { SaveViewDialog } from '@/components/tickets/SaveViewDialog';
import { PaginationBar } from '@/components/PaginationBar';
import { BulkActionBar } from '@/components/tickets/BulkActionBar';
import { apiGet, apiPatch, apiDelete } from '@/lib/apiClient';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { apiGetAllTags } from '@/lib/apiClient';
import { toast } from 'sonner';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelpDialog } from '@/components/KeyboardShortcutsHelpDialog';

const STATUS_COLORS: Record<string, string> = {
  'open': 'bg-blue-50 text-blue-700 border-blue-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  'resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'reopened': 'bg-orange-50 text-orange-700 border-orange-200',
  'merged': 'bg-purple-50 text-purple-700 border-purple-200',
  'closed': 'bg-slate-50 text-slate-500 border-slate-200',
};

export function Tickets() {
  const { tickets: storeTickets, isLoading: storeLoading } = useTicketStore(s => ({ tickets: s.tickets, isLoading: s.isLoading }));
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [apiLoading, setApiLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [tags, setTags] = useState<{ name: string; count: number }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const isLoading = storeLoading || apiLoading;

  useKeyboardShortcuts({
    onNavigateDown: () => setSelectedIndex(i => Math.min(i + 1, filteredTickets.length - 1)),
    onNavigateUp: () => setSelectedIndex(i => Math.max(i - 1, 0)),
    onOpenTicket: () => { if (selectedIndex >= 0 && filteredTickets[selectedIndex]) window.location.href = '/tickets/' + filteredTickets[selectedIndex].id; },
    onSelectTicket: () => { if (selectedIndex >= 0 && filteredTickets[selectedIndex]) toggleSelect(filteredTickets[selectedIndex].id); },
    onCommandPalette: () => {}, // Already handled globally
    onShowHelp: () => setHelpOpen(true),
  }, true);

  useEffect(() => {
    apiGet<{ success: boolean; data: any[] }>('/api/agents')
      .then(res => setAgents((res.data || []).map((a: any) => ({ id: a.userId, name: a.name }))))
      .catch(() => {});
    apiGetAllTags().then(setTags).catch(() => {});
    apiGet<{ success: boolean; data: any[] }>('/api/views')
      .then(res => { if (res.success) setSavedViews(res.data || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchTickets = async () => {
      setApiLoading(true);
      try {
        const res = await apiGet<{ success: boolean; data: any[]; pagination?: any }>(
          `/api/tickets?page=${page}&limit=${limit}&q=${encodeURIComponent(searchQuery)}`
        );
        if (res.pagination) setTotal(res.pagination.total);
        else setTotal(res.data?.length || 0);
      } catch { /* ignore */ } finally { setApiLoading(false); }
    };
    fetchTickets();
  }, [page, limit, searchQuery]);

  const filteredTickets = useMemo(() => {
    let result = storeTickets;
    if (searchQuery) {
      result = result.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter(t => (t.tags || []).some((tag: string) => selectedTags.includes(tag)));
    }
    return result;
  }, [storeTickets, searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const applyView = (view: any) => {
    setActiveView(view.id);
    toast.info(`Applied view: ${view.name}`);
  };

  const deleteView = async (id: string) => {
    try {
      await apiDelete('/api/views/' + id);
      setSavedViews(savedViews.filter((v: any) => v.id !== id));
      if (activeView === id) setActiveView(null);
      toast.success('View deleted');
    } catch { toast.error('Failed to delete view'); }
  };

  const refetchViews = () => {
    apiGet<{ success: boolean; data: any[] }>('/api/views')
      .then(res => { if (res.success) setSavedViews(res.data || []); })
      .catch(() => {});
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === filteredTickets.length ? new Set() : new Set(filteredTickets.map(t => t.id)));
  };
  const handleBulkStatus = async (status: string) => {
    await apiPatch('/api/tickets/bulk', { ids: Array.from(selectedIds), updates: { status } });
    useTicketStore.getState().initialize();
  };
  const handleBulkAssign = async (assignedTo: string) => {
    await apiPatch('/api/tickets/bulk', { ids: Array.from(selectedIds), updates: { assignedTo } });
    useTicketStore.getState().initialize();
  };
  const handleBulkPriority = async (priority: string) => {
    await apiPatch('/api/tickets/bulk', { ids: Array.from(selectedIds), updates: { priority } });
    useTicketStore.getState().initialize();
  };
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} tickets?`)) return;
    await apiDelete('/api/tickets/bulk', { body: JSON.stringify({ ids: Array.from(selectedIds) }) } as any);
    useTicketStore.getState().initialize();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12 space-y-6 animate-fade-in">
      {/* Saved Views Sidebar */}
      {savedViews.length > 0 && (
        <div className="flex gap-4">
          <div className="w-48 shrink-0">
            <Card className="border-none shadow-sm bg-white ring-1 ring-slate-100">
              <CardHeader className="px-4 py-3 border-b border-slate-50 flex flex-row items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Bookmark className="h-3 w-3" /> Views
                </span>
                <SaveViewDialog
                  trigger={<Button size="sm" variant="ghost" className="h-5 w-5 p-0"><Save className="h-3 w-3" /></Button>}
                  currentFilters={{ search: searchQuery, tags: selectedTags }}
                  currentSort={null}
                  onSuccess={refetchViews}
                />
              </CardHeader>
              <CardContent className="p-2">
                {savedViews.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-accent group">
                    <button type="button"
                      className={`flex-1 text-left text-xs ${activeView === v.id ? 'font-semibold text-indigo-600' : 'text-muted-foreground'}`}
                      onClick={() => applyView(v)}>
                      {v.isDefault && <BookmarkCheck className="h-3 w-3 inline mr-1 text-indigo-400" />}
                      {v.name}
                    </button>
                    {!v.isDefault && (
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteView(v.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Center</h1>
          <p className="text-muted-foreground">Unified view of all customer interactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateTicketDialog
            trigger={<Button variant="outline" className="h-10"><Plus className="size-4 mr-2" /> Manual Ticket</Button>}
          />
          <Button className="bg-indigo-600 hover:bg-indigo-700 h-10 shadow-lg shadow-indigo-100" asChild>
            <Link to="/live-call">New Live Intake</Link>
          </Button>
        </div>
      </div>
      <Card className="border-none shadow-sm bg-white overflow-hidden ring-1 ring-slate-100">
        <CardHeader className="p-4 px-6 border-b border-slate-50 flex flex-row items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search ID, title, or user..." className="pl-9 h-11 bg-slate-50 border-transparent focus:bg-white transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {tags.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-11 gap-1", selectedTags.length > 0 && "bg-indigo-50 text-indigo-700 border-indigo-200")}>
                  <Filter className="h-4 w-4" /> Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Filter by Tags</p>
                <div className="space-y-1 max-h-48 overflow-auto">
                  {tags.map((t: any) => (
                    <button key={t.name} type="button"
                      className={`w-full text-left px-2 py-1 text-sm rounded hover:bg-accent flex items-center justify-between ${selectedTags.includes(t.name) ? 'bg-indigo-50 text-indigo-700' : ''}`}
                      onClick={() => toggleTag(t.name)}>
                      <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.count}</span>
                    </button>
                  ))}
                </div>
                {selectedTags.length > 0 && (
                  <Button size="sm" variant="ghost" className="w-full mt-2 text-xs" onClick={() => setSelectedTags([])}>Clear all</Button>
                )}
              </PopoverContent>
            </Popover>
          )}
          <div className="text-sm font-medium text-slate-400 ml-auto">
            {total > 0 ? `${total} total` : `${filteredTickets.length} Results`}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                  <th className="px-6 py-4 w-10">
                    <Checkbox checked={filteredTickets.length > 0 && selectedIds.size === filteredTickets.length} onCheckedChange={toggleSelectAll} />
                  </th>
                  <th className="px-6 py-4">Descriptor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">SLA</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (<tr key={i}><td colSpan={8} className="px-6 py-4"><Skeleton className="h-12 w-full" /></td></tr>))
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className={`hover:bg-slate-50/80 transition-all group ${selectedIds.has(ticket.id) ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <Checkbox checked={selectedIds.has(ticket.id)} onCheckedChange={() => toggleSelect(ticket.id)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-indigo-400 font-bold mb-0.5">{ticket.id}</span>
                          <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{ticket.title}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{ticket.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={cn("capitalize px-3 py-1 font-semibold", STATUS_COLORS[ticket.status] || 'bg-slate-50 text-slate-700 border-slate-200')}>
                          {ticket.status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{ticket.customerName}</td>
                      <td className="px-6 py-4">
                        <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize text-[10px] px-2 py-0.5">{ticket.priority}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-mono">—</Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground font-medium">{ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, yyyy') : 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" asChild className="text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full">
                          <Link to={`/tickets/${ticket.id}`}><ExternalLink className="size-4" /></Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!isLoading && filteredTickets.length === 0 && (
            <div className="py-24 text-center">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-slate-50 text-slate-200 mb-4 ring-1 ring-slate-100"><Inbox className="size-10" /></div>
              <h3 className="text-xl font-bold text-slate-900">No matches found</h3>
              <p className="text-slate-400 mt-2 max-w-xs mx-auto">Try refining your search terms or starting a new intake session.</p>
              <Button variant="link" onClick={() => setSearchQuery('')} className="mt-4 text-indigo-600">Clear all filters</Button>
            </div>
          )}
        </CardContent>
        {total > 0 && (
          <PaginationBar page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit} />
        )}
      </Card>
      <BulkActionBar selectedCount={selectedIds.size} selectedIds={Array.from(selectedIds)} tickets={storeTickets} onClear={() => setSelectedIds(new Set())} onStatusChange={handleBulkStatus} onAssign={handleBulkAssign} onPriorityChange={handleBulkPriority} onDelete={handleBulkDelete} agents={agents} />
          </div>
        </div>
      )}
      {savedViews.length === 0 && (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Center</h1>
          <p className="text-muted-foreground">Unified view of all customer interactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateTicketDialog trigger={<Button variant="outline" className="h-10"><Plus className="size-4 mr-2" /> Manual Ticket</Button>} />
          <Button className="bg-indigo-600 hover:bg-indigo-700 h-10 shadow-lg shadow-indigo-100" asChild><Link to="/live-call">New Live Intake</Link></Button>
        </div>
      </div>
      <Card className="border-none shadow-sm bg-white overflow-hidden ring-1 ring-slate-100">
        <CardHeader className="p-4 px-6 border-b border-slate-50 flex flex-row items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search ID, title, or user..." className="pl-9 h-11 bg-slate-50 border-transparent focus:bg-white transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="text-sm font-medium text-slate-400 ml-auto">{total > 0 ? `${total} total` : `${filteredTickets.length} Results`}</div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                  <th className="px-6 py-4 w-10"><Checkbox checked={filteredTickets.length > 0 && selectedIds.size === filteredTickets.length} onCheckedChange={toggleSelectAll} /></th>
                  <th className="px-6 py-4">Descriptor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">SLA</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (<tr key={i}><td colSpan={8} className="px-6 py-4"><Skeleton className="h-12 w-full" /></td></tr>)) : filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className={`hover:bg-slate-50/80 transition-all group ${selectedIds.has(ticket.id) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-6 py-4"><Checkbox checked={selectedIds.has(ticket.id)} onCheckedChange={() => toggleSelect(ticket.id)} /></td>
                    <td className="px-6 py-4"><div className="flex flex-col"><span className="text-[10px] font-mono text-indigo-400 font-bold mb-0.5">{ticket.id}</span><span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{ticket.title}</span><span className="text-xs text-muted-foreground mt-0.5">{ticket.category}</span></div></td>
                    <td className="px-6 py-4"><Badge variant="outline" className={cn("capitalize px-3 py-1 font-semibold", STATUS_COLORS[ticket.status] || 'bg-slate-50 text-slate-700 border-slate-200')}>{ticket.status.replace('-', ' ')}</Badge></td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{ticket.customerName}</td>
                    <td className="px-6 py-4"><Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize text-[10px] px-2 py-0.5">{ticket.priority}</Badge></td>
                    <td className="px-6 py-4"><Badge variant="outline" className="text-[10px] px-2 py-0.5 font-mono">—</Badge></td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-medium">{ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, yyyy') : 'N/A'}</td>
                    <td className="px-6 py-4 text-right"><Button variant="ghost" size="icon" asChild className="text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"><Link to={`/tickets/${ticket.id}`}><ExternalLink className="size-4" /></Link></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isLoading && filteredTickets.length === 0 && (
            <div className="py-24 text-center"><div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-slate-50 text-slate-200 mb-4 ring-1 ring-slate-100"><Inbox className="size-10" /></div><h3 className="text-xl font-bold text-slate-900">No matches found</h3><p className="text-slate-400 mt-2 max-w-xs mx-auto">Try refining your search terms or starting a new intake session.</p><Button variant="link" onClick={() => setSearchQuery('')} className="mt-4 text-indigo-600">Clear all filters</Button></div>
          )}
        </CardContent>
        {total > 0 && (<PaginationBar page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={setLimit} />)}
      </Card>
      <BulkActionBar selectedCount={selectedIds.size} selectedIds={Array.from(selectedIds)} tickets={storeTickets} onClear={() => setSelectedIds(new Set())} onStatusChange={handleBulkStatus} onAssign={handleBulkAssign} onPriorityChange={handleBulkPriority} onDelete={handleBulkDelete} agents={agents} />
        </>
      )}
      <KeyboardShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
