import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTicketStore } from '@/store/ticketStore';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Inbox, ExternalLink, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
export function Tickets() {
  const tickets = useTicketStore(s => s.tickets);
  const isLoading = useTicketStore(s => s.isLoading);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredTickets = useMemo(() => {
    return tickets.filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [tickets, searchQuery]);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Center</h1>
          <p className="text-muted-foreground">Unified view of all customer interactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 px-4">
            <Filter className="size-4 mr-2" /> Status: All
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 h-10 shadow-lg shadow-indigo-100" asChild>
            <Link to="/live-call">New Live Intake</Link>
          </Button>
        </div>
      </div>
      <Card className="border-none shadow-sm bg-white overflow-hidden ring-1 ring-slate-100">
        <CardHeader className="p-4 px-6 border-b border-slate-50 flex flex-row items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search ID, title, or user..."
              className="pl-9 h-11 bg-slate-50 border-transparent focus:bg-white transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-sm font-medium text-slate-400 ml-auto">
            {filteredTickets.length} Results
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b">
                  <th className="px-6 py-4">Descriptor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-4"><Skeleton className="h-12 w-full" /></td>
                    </tr>
                  ))
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-indigo-400 font-bold mb-0.5">{ticket.id}</span>
                          <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{ticket.title}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{ticket.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className={cn("capitalize px-3 py-1 font-semibold", getStatusColor(ticket.status))}>
                          {ticket.status.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{ticket.customerName}</td>
                      <td className="px-6 py-4">
                        <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize text-[10px] px-2 py-0.5">
                          {ticket.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                        {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                      </td>
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
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-slate-50 text-slate-200 mb-4 ring-1 ring-slate-100">
                <Inbox className="size-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">No matches found</h3>
              <p className="text-slate-400 mt-2 max-w-xs mx-auto">Try refining your search terms or starting a new intake session.</p>
              <Button variant="link" onClick={() => setSearchQuery('')} className="mt-4 text-indigo-600">Clear all filters</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}