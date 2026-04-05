import React, { useState } from 'react';
import { useTicketStore } from '@/store/ticketStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export function Tickets() {
  const tickets = useTicketStore(state => state.tickets);
  const [searchQuery, setSearchQuery] = useState('');
  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in-progress': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ticket Center</h1>
          <p className="text-muted-foreground mt-1">Manage and respond to customer support tickets.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="size-4" /> Filters
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700">New Ticket</Button>
        </div>
      </div>
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-4 px-6 border-b border-slate-50 flex flex-row items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Filter by title, customer..." 
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="text-sm text-muted-foreground hidden md:block">
            Showing <span className="font-semibold text-foreground">{filteredTickets.length}</span> tickets
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-slate-400 mb-0.5">{ticket.id}</span>
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{ticket.title}</span>
                        <span className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ticket.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn("capitalize px-2 py-0.5 font-medium border", getStatusColor(ticket.status))}>
                        {ticket.status.replace('-', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{ticket.customerName}</td>
                    <td className="px-6 py-4">
                       <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize text-[10px]">
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTickets.length === 0 && (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-400 mb-4">
                <Search className="size-6" />
              </div>
              <p className="text-slate-500 font-medium">No tickets found matching your search.</p>
              <Button variant="link" onClick={() => setSearchQuery('')} className="text-indigo-600">Clear filters</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}