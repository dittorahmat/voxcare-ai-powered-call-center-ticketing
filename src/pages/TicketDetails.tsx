import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTicketStore } from '@/store/ticketStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Save,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
export function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tickets = useTicketStore(s => s.tickets);
  const updateTicketStatus = useTicketStore(s => s.updateTicketStatus);
  const updateTicket = useTicketStore(s => s.updateTicket);
  const ticket = tickets.find(t => t.id === id);
  const [localDesc, setLocalDesc] = useState(ticket?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => {
    if (ticket) setLocalDesc(ticket.description);
  }, [ticket?.id]);
  if (!ticket) return <div className="p-20 text-center"><h2 className="text-2xl font-bold">Ticket not found</h2><Link to="/tickets">Go back</Link></div>;
  const handleStatusChange = (newStatus: any) => updateTicketStatus(ticket.id, newStatus);
  const saveNotes = async () => {
    setIsSaving(true);
    await updateTicket(ticket.id, { description: localDesc });
    setTimeout(() => setIsSaving(false), 800);
  };
  const timeline = [
    { date: ticket.createdAt, event: "Ticket Created via Voice Intake", icon: Sparkles, color: "text-indigo-600" },
    { date: ticket.createdAt, event: "AI Content Extraction Completed", icon: ShieldAlert, color: "text-amber-600" },
    ...(ticket.status !== 'open' ? [{ date: new Date().toISOString(), event: `Status updated to ${ticket.status}`, icon: CheckCircle2, color: "text-emerald-600" }] : [])
  ];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12 animate-fade-in space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100">
          <Link to="/tickets"><ArrowLeft className="size-4" /></Link>
        </Button>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-indigo-400">{ticket.id}</span>
            <Badge variant={ticket.status === 'resolved' ? 'success' : 'outline'} className="capitalize">{ticket.status}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1 text-slate-900">{ticket.title}</h1>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-slate-100">
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="size-5 text-indigo-600" /> Interaction Console
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="transcript" className="w-full">
                <TabsList className="w-full grid grid-cols-2 rounded-none bg-slate-50/50">
                  <TabsTrigger value="transcript" className="data-[state=active]:bg-white rounded-none border-b-2 data-[state=active]:border-indigo-600">Voice Transcript</TabsTrigger>
                  <TabsTrigger value="notes" className="data-[state=active]:bg-white rounded-none border-b-2 data-[state=active]:border-indigo-600">Resolution Notes</TabsTrigger>
                </TabsList>
                <div className="p-6">
                  <TabsContent value="transcript" className="space-y-4 m-0">
                    <div className="bg-slate-50/80 rounded-2xl p-6 border ring-1 ring-slate-100 min-h-[300px]">
                      {ticket.transcript ? (
                        <div className="space-y-4">
                          {ticket.transcript.split('\n').map((l, i) => (
                            <div key={i} className={`p-3 rounded-xl text-sm ${i%2===0?'bg-white border text-slate-700':'bg-indigo-50/50 text-indigo-900 border border-indigo-100/50'}`}>
                              <span className="font-bold opacity-40 mr-2 text-[10px] uppercase">{i%2===0?'Agent':'Customer'}</span> {l}
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-center py-20 text-slate-400">No recording data available.</p>}
                    </div>
                  </TabsContent>
                  <TabsContent value="notes" className="space-y-4 m-0">
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Resolution Details</label>
                         <Button onClick={saveNotes} variant="ghost" size="sm" className="h-8 text-indigo-600">
                           {isSaving ? <Check className="size-4 mr-2" /> : <Save className="size-4 mr-2" />} {isSaving ? 'Saved' : 'Save Changes'}
                         </Button>
                       </div>
                       <Textarea value={localDesc} onChange={e => setLocalDesc(e.target.value)} className="min-h-[300px] text-base leading-relaxed bg-slate-50 border-transparent focus:bg-white focus:ring-1 focus:ring-indigo-100" />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-slate-100">
            <CardHeader><CardTitle className="text-sm font-bold uppercase text-slate-400 tracking-widest">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-6 relative z-10">
                    <div className={`h-6 w-6 rounded-full bg-white ring-2 ring-slate-100 flex items-center justify-center ${item.color}`}>
                      <item.icon className="size-3" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.event}</p>
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(item.date), 'PPpp')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-indigo-50">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest">AI Intelligence</span>
              <Badge className="bg-indigo-400/50 text-white border-none">94% Confidence</Badge>
            </div>
            <CardContent className="p-6 space-y-6">
               <div className="grid grid-cols-1 gap-4">
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Priority Vector</p>
                   <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'secondary'} className="w-full justify-center py-2 text-sm">{ticket.priority.toUpperCase()}</Badge>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Category Segment</p>
                   <div className="flex items-center gap-2 font-bold text-slate-700"><Tag className="size-4 text-indigo-500" /> {ticket.category}</div>
                 </div>
               </div>
               <Separator />
               <div className="space-y-3">
                 <p className="text-xs font-bold text-slate-400 uppercase">Status Lifecycle</p>
                 <div className="grid gap-2">
                   {ticket.status !== 'resolved' ? (
                     <Button onClick={() => handleStatusChange('resolved')} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl shadow-lg shadow-emerald-50"><CheckCircle2 className="size-4 mr-2" /> Mark Resolved</Button>
                   ) : <Badge className="w-full justify-center py-3 text-sm bg-emerald-50 text-emerald-700 border-emerald-100 shadow-none">Resolved & Verified</Badge>}
                   {ticket.status === 'open' && <Button variant="outline" onClick={() => handleStatusChange('in-progress')} className="w-full h-12 rounded-xl">Assign to Me</Button>}
                 </div>
               </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-slate-100">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><User className="size-5" /></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">Customer Profile</p><p className="font-bold text-slate-900">{ticket.customerName}</p></div>
              </div>
              <Separator className="opacity-50" />
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><Calendar className="size-5" /></div>
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">First Contact</p><p className="font-bold text-slate-900">{format(new Date(ticket.createdAt), 'MMM d, p')}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}