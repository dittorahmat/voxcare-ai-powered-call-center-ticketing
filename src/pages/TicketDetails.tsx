import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTicketStore } from '@/store/ticketStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Tag, 
  MessageSquare, 
  Sparkles, 
  ShieldAlert,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
export function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tickets = useTicketStore(s => s.tickets);
  const updateTicketStatus = useTicketStore(s => s.updateTicketStatus);
  const ticket = tickets.find(t => t.id === id);
  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold">Ticket not found</h2>
        <Button variant="link" onClick={() => navigate('/tickets')}>Back to Tickets</Button>
      </div>
    );
  }
  const handleStatusChange = (newStatus: any) => {
    updateTicketStatus(ticket.id, newStatus);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12 space-y-8 animate-fade-in">
        {/* Header Navigation */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/tickets"><ArrowLeft className="size-4" /></Link>
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-muted-foreground">{ticket.id}</span>
              <Badge variant={ticket.status === 'resolved' ? 'success' : 'outline'} className="capitalize">
                {ticket.status.replace('-', ' ')}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mt-1">{ticket.title}</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Context & Transcript */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="size-5 text-indigo-600" />
                  Conversation Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="transcript" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="transcript">Original Transcript</TabsTrigger>
                    <TabsTrigger value="notes">Agent Notes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="transcript" className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-6 min-h-[300px] border border-slate-100">
                      {ticket.transcript ? (
                        <div className="space-y-4">
                          {ticket.transcript.split('\n').map((line, idx) => (
                            <p key={idx} className="text-sm leading-relaxed text-slate-700">
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                          <MessageSquare className="size-10 mb-2 opacity-20" />
                          <p>No transcript available for this ticket.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="notes">
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-slate-900">Description</p>
                      <p className="text-sm text-muted-foreground leading-relaxed bg-slate-50 p-4 rounded-lg">
                        {ticket.description}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          {/* Right Column: AI Analysis & Metadata */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-indigo-50/50 border-b border-indigo-100/50">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
                  <Sparkles className="size-4" />
                  AI INTELLIGENCE
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    <span>Priority Level</span>
                    <ShieldAlert className="size-3" />
                  </div>
                  <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'secondary'} className="w-full justify-center py-1.5 text-sm">
                    {ticket.priority.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-bold uppercase tracking-wider">
                    <span>Category</span>
                    <Tag className="size-3" />
                  </div>
                  <p className="text-sm font-semibold px-3 py-2 bg-slate-50 rounded-md border border-slate-100">
                    {ticket.category}
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Agent Actions</p>
                  <div className="grid grid-cols-1 gap-2">
                    {ticket.status !== 'resolved' && (
                      <Button 
                        onClick={() => handleStatusChange('resolved')}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="size-4 mr-2" /> Mark as Resolved
                      </Button>
                    )}
                    {ticket.status === 'open' && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleStatusChange('in-progress')}
                        className="w-full"
                      >
                        <Clock className="size-4 mr-2" /> Start Working
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <User className="size-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium">{ticket.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="size-4 text-slate-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created At</p>
                    <p className="font-medium">{format(new Date(ticket.createdAt), 'PPp')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}