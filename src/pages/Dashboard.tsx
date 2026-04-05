import React from 'react';
import { useTicketStore } from '@/store/ticketStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Inbox, CheckCircle2, Clock, Activity, ArrowUpRight, PhoneCall } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
export function Dashboard() {
  const tickets = useTicketStore(state => state.tickets);
  const stats = [
    { label: 'Total Tickets', value: tickets.length, icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open', value: tickets.filter(t => t.status === 'open').length, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Resolved', value: tickets.filter(t => t.status === 'resolved').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Avg. Handling', value: '14m', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];
  const recentTickets = [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Agent Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Jane. Here's what's happening with your queue today.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-all duration-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-6 py-5">
            <div>
              <CardTitle className="text-lg">Recent Tickets</CardTitle>
              <CardDescription>Latest customer inquiries and updates.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-indigo-600 hover:text-indigo-700 font-semibold">
              <Link to="/tickets">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 px-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono text-slate-400">{ticket.id}</span>
                    <p className="font-semibold text-slate-900">{ticket.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{ticket.customerName}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span>{formatDistanceToNow(new Date(ticket.createdAt))} ago</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize text-[10px]">
                      {ticket.priority}
                    </Badge>
                    <Link to={`/tickets/${ticket.id}`} className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-400">
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-indigo-600 text-white">
          <CardHeader>
            <CardTitle className="text-white">Active Queue</CardTitle>
            <CardDescription className="text-indigo-100">Ready for the next call?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-indigo-500/50 flex items-center justify-center">
                  <PhoneCall className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-200">Call Queue Status</p>
                  <p className="text-lg font-bold">2 callers waiting</p>
                </div>
              </div>
            </div>
            <Button asChild className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold h-12 shadow-xl shadow-indigo-900/20">
              <Link to="/live-call">Go to Intake</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}