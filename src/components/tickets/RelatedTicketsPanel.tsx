import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, Search, X, LinkIcon, Unlink } from 'lucide-react';
import { apiGetTicketRelations, apiPostRelation, apiDeleteRelation, apiGet } from '@/lib/apiClient';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'sonner';

interface RelatedTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  relationId: string;
  relationType: 'parent-child' | 'related';
}

const statusColors: Record<string, string> = {
  'open': 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  'resolved': 'bg-green-100 text-green-800',
  'reopened': 'bg-orange-100 text-orange-800',
  'merged': 'bg-purple-100 text-purple-800',
};

interface RelatedTicketsPanelProps {
  ticketId: string;
  canUnlink?: boolean;
}

export function RelatedTicketsPanel({ ticketId, canUnlink = false }: RelatedTicketsPanelProps) {
  const [related, setRelated] = useState<RelatedTicket[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; status: string }[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [relType, setRelType] = useState<'parent-child' | 'related'>('related');

  useEffect(() => {
    apiGetTicketRelations(ticketId).then(res => {
      if (res.success) {
        Promise.all(
          res.data.map(async (r: any) => {
            const otherId = r.ticketA === ticketId ? r.ticketB : r.ticketA;
            const ticketRes = await apiGet(`/api/tickets`);
            const ticket = (ticketRes.success ? ticketRes.data : []).find((t: any) => t.id === otherId);
            return ticket ? {
              id: ticket.id,
              title: ticket.title,
              status: ticket.status,
              priority: ticket.priority,
              relationId: r.id,
              relationType: r.type,
            } : null;
          })
        ).then(results => setRelated(results.filter(Boolean)));
      }
    });
  }, [ticketId]);

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await apiGet(`/api/search?q=${encodeURIComponent(q)}`);
    if (res.success) {
      const ticketResults = (res.data?.tickets || []).filter((t: any) => t.id !== ticketId);
      setSearchResults(ticketResults);
    }
  };

  const handleLink = async (targetId: string) => {
    try {
      await apiPostRelation(ticketId, targetId, relType);
      toast.success('Tickets linked');
      setShowSearch(false);
      setSearch('');
      setSearchResults([]);
      // Reload relations
      apiGetTicketRelations(ticketId).then(res => {
        if (res.success) {
          Promise.all(
            res.data.map(async (r: any) => {
              const otherId = r.ticketA === ticketId ? r.ticketB : r.ticketA;
              const ticketRes = await apiGet(`/api/tickets`);
              const ticket = (ticketRes.success ? ticketRes.data : []).find((t: any) => t.id === otherId);
              return ticket ? { id: ticket.id, title: ticket.title, status: ticket.status, priority: ticket.priority, relationId: r.id, relationType: r.type } : null;
            })
          ).then(results => setRelated(results.filter(Boolean)));
        }
      });
    } catch {
      toast.error('Failed to link tickets');
    }
  };

  const handleUnlink = async (relationId: string) => {
    try {
      await apiDeleteRelation(relationId);
      setRelated(related.filter(r => r.relationId !== relationId));
      toast.success('Tickets unlinked');
    } catch {
      toast.error('Failed to unlink tickets');
    }
  };

  if (related.length === 0 && !showSearch) {
    return (
      <Card className="border-none shadow-sm ring-1 ring-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <LinkIcon className="size-4" /> Related Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">No related tickets</p>
          <Button size="sm" variant="outline" onClick={() => setShowSearch(true)} className="w-full">
            <Link className="h-4 w-4 mr-1" /> Link Ticket
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm ring-1 ring-slate-100">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <LinkIcon className="size-4" /> Related Tickets
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowSearch(true)}>
            <Link className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {related.map(r => (
          <div key={r.relationId} className="flex items-start justify-between p-2 bg-slate-50 rounded-md">
            <div className="flex-1 min-w-0">
              <RouterLink to={`/tickets/${r.id}`} className="text-sm font-medium hover:text-primary truncate block">
                {r.title}
              </RouterLink>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-[10px] ${statusColors[r.status] || 'bg-gray-100 text-gray-800'}`}>
                  {r.status}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{r.relationType}</Badge>
              </div>
            </div>
            {canUnlink && (
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleUnlink(r.relationId)}>
                <Unlink className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {showSearch && (
          <div className="pt-2 border-t">
            <div className="flex gap-2 mb-2">
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as 'parent-child' | 'related')}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="related">Related</option>
                <option value="parent-child">Parent-Child</option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search tickets..."
                className="pl-8 text-sm"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-md max-h-32 overflow-auto">
                {searchResults.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent border-b last:border-b-0"
                    onClick={() => handleLink(r.id)}
                  >
                    <span className="font-medium">#{r.id}</span> — {r.title}
                  </button>
                ))}
              </div>
            )}
            <Button size="sm" variant="ghost" className="w-full mt-2 text-xs" onClick={() => { setShowSearch(false); setSearch(''); setSearchResults([]); }}>
              <X className="h-3 w-3 mr-1" /> Close
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
