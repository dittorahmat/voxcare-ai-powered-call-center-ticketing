import React, { useMemo } from 'react';
import { useTicketStore } from '@/store/ticketStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Inbox, CheckCircle2, Clock, Activity, ArrowUpRight, PhoneCall } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
export function Dashboard() {
  const tickets = useTicketStore(s => s.tickets);
  const isLoading = useTicketStore(s => s.isLoading);
  const stats = useMemo(() => [
    { label: 'Total Tickets', value: tickets.length, icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open', value: tickets.filter(t => t.status === 'open').length, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Resolved', value: tickets.filter(t => t.status === 'resolved').length, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'High Priority', value: tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length, icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
  ], [tickets]);
  const priorityData = useMemo(() => {
    const counts = { low: 0, medium: 0, high: 0, urgent: 0 };
    tickets.forEach(t => counts[t.priority]++);
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tickets]);
  const COLORS = ['#94a3b8', '#fbbf24', '#f87171', '#ef4444'];
  const recentTickets = useMemo(() => 
    [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
  , [tickets]);
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Activity className="animate-spin text-indigo-600" /></div>;
  }
  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Agent Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Jane. Here's your real-time performance overview.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
                <div className={`${stat.bg} ${stat.color} p-3 rounded-xl shadow-inner`}>
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
              <CardTitle className="text-lg">Priority Distribution</CardTitle>
              <CardDescription>Visual breakdown of current ticket workload.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-6 h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                   {priorityData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-indigo-600 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700 opacity-90" />
          <div className="absolute inset-0 shimmer-bg opacity-10" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-white text-xl">Voice Intake Queue</CardTitle>
            <CardDescription className="text-indigo-100">AI-powered transcription ready.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-indigo-400/30 flex items-center justify-center animate-pulse">
                  <PhoneCall className="size-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-indigo-100 uppercase tracking-widest">Status</p>
                  <p className="text-xl font-bold">System Online</p>
                </div>
              </div>
            </div>
            <Button asChild className="w-full bg-white text-indigo-600 hover:bg-slate-50 font-bold h-14 text-lg rounded-xl shadow-2xl transition-transform active:scale-95">
              <Link to="/live-call">Open Voice Console</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 px-6 py-5">
            <div>
              <CardTitle className="text-lg">Recent Tickets</CardTitle>
              <CardDescription>Real-time updates from the field.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-indigo-600 font-semibold">
              <Link to="/tickets">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {recentTickets.map((ticket) => (
                <div key={ticket.id} className="p-4 px-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-slate-400">{ticket.id}</span>
                    <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{ticket.title}</p>
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
                    <Link to={`/tickets/${ticket.id}`} className="p-2 rounded-full bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
      </Card>
    </div>
  );
}