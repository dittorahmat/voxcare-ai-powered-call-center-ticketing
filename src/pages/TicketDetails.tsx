import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTicketStore } from '@/store/ticketStore';
import { useAuth } from '@/context/AuthContext';
import { apiPatch, apiGet } from '@/lib/apiClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Calendar, User, Tag, MessageSquare, Sparkles, ShieldAlert, CheckCircle2, Save, Check, Clock, Paperclip, Upload, ExternalLink, Trash2, Link as LinkIcon, Send } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { TagInput } from '@/components/tickets/TagInput';
import { RelatedTicketsPanel } from '@/components/tickets/RelatedTicketsPanel';
import { ActivityFilter } from '@/components/tickets/ActivityFilter';
import { ConversationThread } from '@/components/tickets/ConversationThread';
import { apiGetAllTags, apiPostRelation, apiDeleteRelation } from '@/lib/apiClient';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelpDialog } from '@/components/KeyboardShortcutsHelpDialog';
export function TicketDetails() {
  const { id } = useParams();
  const tickets = useTicketStore(s => s.tickets);
  const updateTicketStatus = useTicketStore(s => s.updateTicketStatus);
  const updateTicket = useTicketStore(s => s.updateTicket);
  const ticket = tickets.find(t => t.id === id);
  const [localDesc, setLocalDesc] = useState(ticket?.publicNotes?.text || ticket?.description || '');
  const [threadReplies, setThreadReplies] = useState<any[]>([]);
  const [agentReplyText, setAgentReplyText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState('');
  const [internalNoteDialogOpen, setInternalNoteDialogOpen] = useState(false);
  const { user } = useAuth();
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [selectedCanned, setSelectedCanned] = useState('');
  const [cannedLoaded, setCannedLoaded] = useState(false);
  const [tags, setTags] = useState<string[]>(ticket?.tags || []);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (ticket) {
      setLocalDesc(ticket.description);
      setTags(ticket.tags || []);
    }
  }, [ticket]);

  useEffect(() => {
    apiGetAllTags().then(setTagSuggestions);
  }, []);

  const handleTagsChange = async (newTags: string[]) => {
    setTags(newTags);
    if (ticket) {
      await updateTicket(ticket.id, { tags: newTags });
    }
  };

  useEffect(() => {
    if (!cannedLoaded) {
      apiGet<{ success: boolean; data: any[] }>('/api/canned-responses')
        .then(res => { if (res.success) setCannedResponses(res.data || []); setCannedLoaded(true); })
        .catch(() => setCannedLoaded(true));
    }
  }, [cannedLoaded]);

  // Load thread replies
  useEffect(() => {
    if (id) {
      apiGet<{ success: boolean; data: any[] }>(`/api/tickets/${id}/replies`)
        .then(res => { if (res.success) setThreadReplies(res.data); })
        .catch(() => {});
    }
  }, [id]);

  const handleAgentReply = async () => {
    if (!agentReplyText.trim() || !id) return;
    try {
      const res = await apiPost(`/api/tickets/${id}/replies`, { text: agentReplyText.trim() });
      if (res.success) {
        setThreadReplies(prev => [...prev, res.data]);
        setAgentReplyText('');
        // Also update publicNotes for backward compat
        if (ticket) {
          await updateTicket(ticket.id, {
            publicNotes: { text: agentReplyText.trim(), authorId: user?.id || '', authorName: user?.name || 'Agent', timestamp: new Date().toISOString() },
          } as any);
        }
      }
    } catch {
      // Error handled by client
    }
  };

  useKeyboardShortcuts({
    onReply: () => { const el = document.querySelector('[data-public-note]') as HTMLElement; el?.focus(); },
    onInternalNote: () => setInternalNoteDialogOpen(true),
    onCloseModal: () => { setInternalNoteDialogOpen(false); setHelpOpen(false); },
    onShowHelp: () => setHelpOpen(true),
  }, true);

  const applyCannedResponse = (id: string) => {
    const cr = cannedResponses.find(r => r.id === id);
    if (cr) {
      let body = cr.body;
      body = body.replace(/\{\{customer_name\}\}/g, ticket.customerName);
      body = body.replace(/\{\{ticket_id\}\}/g, ticket.id);
      body = body.replace(/\{\{agent_name\}\}/g, user?.name || 'Agent');
      setInternalNoteText(prev => prev + (prev ? '\n\n' : '') + body);
      setSelectedCanned('');
    }
  };
  if (!ticket) {
    return (
      <div className="p-20 text-center">
        <h2 className="text-2xl font-bold">Ticket not found</h2>
        <Link to="/tickets" className="text-indigo-600 hover:underline mt-2 inline-block">Go back to Ticket Center</Link>
      </div>
    );
  }

  if (ticket.status === 'merged' && ticket.mergedInto) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-2xl font-bold text-muted-foreground">This ticket has been merged</h2>
        <p className="text-muted-foreground">This ticket was merged into another ticket and is now read-only.</p>
        <Link to={`/tickets/${ticket.mergedInto}`} className="text-indigo-600 hover:underline font-medium inline-flex items-center gap-2">
          View Primary Ticket →
        </Link>
      </div>
    );
  }
  const saveNotes = async () => {
    setIsSaving(true);
    await updateTicket(ticket.id, {
      description: localDesc,
      publicNotes: { text: localDesc, authorId: user?.id || '', authorName: user?.name || 'Agent', timestamp: new Date().toISOString() },
    });
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleSaveInternalNote = async () => {
    if (!internalNoteText.trim() || !user) return;
    const note = { text: internalNoteText, authorId: user.id, authorName: user.name, timestamp: new Date().toISOString() };
    const existingNotes = ticket.internalNotes || [];
    await apiPatch(`/api/tickets/${ticket.id}`, {
      internalNotes: [...existingNotes, note],
    });
    setInternalNoteText('');
    useTicketStore.getState().initialize();
  };

  const addInternalNote = handleSaveInternalNote;

  const handleReopen = async () => {
    // Create new SLA record for reopened ticket
    await apiPatch(`/api/tickets/${ticket.id}`, { status: 'reopened', slaRecordId: null });
    useTicketStore.getState().initialize();
  };
  const timeline = [
    { 
      date: ticket.createdAt, 
      event: ticket.transcript ? "Ticket Created via Voice Intake" : "Ticket Created Manually", 
      icon: Sparkles, 
      color: "text-indigo-600" 
    },
    { 
      date: ticket.createdAt, 
      event: "Priority Assessment Completed", 
      icon: ShieldAlert, 
      color: "text-amber-600" 
    },
    ...(ticket.status !== 'open' ? [{ 
      date: new Date().toISOString(), 
      event: `Status updated to ${ticket.status}`, 
      icon: CheckCircle2, 
      color: "text-emerald-600" 
    }] : [])
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
              <Tabs defaultValue={ticket.transcript ? "transcript" : "thread"} className="w-full">
                <TabsList className="w-full grid grid-cols-4 rounded-none bg-slate-50/50">
                  <TabsTrigger value="thread" className="data-[state=active]:bg-white rounded-none border-b-2 data-[state=active]:border-indigo-600">Thread</TabsTrigger>
                  <TabsTrigger value="transcript" className="data-[state=active]:bg-white rounded-none border-b-2 data-[state=active]:border-indigo-600">Voice Transcript</TabsTrigger>
                  <TabsTrigger value="public-notes" className="data-[state=active]:bg-white rounded-none border-b-2 data-[state=active]:border-indigo-600">Public Notes</TabsTrigger>
                  <TabsTrigger value="internal-notes" className="data-[state=active]:bg-white rounded-none border-b-2 data-[state=active]:border-amber-500">Internal Notes</TabsTrigger>
                </TabsList>
                <div className="p-6">
                  <TabsContent value="thread" className="space-y-4 m-0">
                    <div className="space-y-4">
                      <ScrollArea className="h-[400px] pr-4">
                        <ConversationThread replies={threadReplies} />
                      </ScrollArea>
                      <div className="flex gap-2 pt-2 border-t">
                        <Textarea
                          value={agentReplyText}
                          onChange={e => setAgentReplyText(e.target.value)}
                          placeholder="Balas sebagai agen..."
                          className="min-h-[60px]"
                          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleAgentReply(); } }}
                        />
                        <Button onClick={handleAgentReply} disabled={!agentReplyText.trim()} size="sm" className="self-end">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
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
                      ) : <p className="text-center py-20 text-slate-400">No recording data available for this manual ticket.</p>}
                    </div>
                  </TabsContent>
                  <TabsContent value="public-notes" className="space-y-4 m-0">
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Public Resolution Notes</label>
                         <Button onClick={saveNotes} variant="ghost" size="sm" className="h-8 text-indigo-600">
                           {isSaving ? <Check className="size-4 mr-2" /> : <Save className="size-4 mr-2" />} {isSaving ? 'Saved' : 'Save'}
                         </Button>
                       </div>
                       <Textarea value={localDesc} onChange={e => setLocalDesc(e.target.value)} className="min-h-[300px] text-base leading-relaxed bg-slate-50 border-transparent focus:bg-white focus:ring-1 focus:ring-indigo-100" />
                       {ticket.publicNotes && ticket.publicNotes.timestamp && (
                         <p className="text-xs text-muted-foreground">Last updated {format(new Date(ticket.publicNotes.timestamp), 'PPp')} by {ticket.publicNotes.authorName}</p>
                       )}
                    </div>
                  </TabsContent>
                  <TabsContent value="internal-notes" className="space-y-4 m-0">
                    <div className="space-y-3">
                       <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">🔒 Internal Agent Notes</label>
                         <Button onClick={addInternalNote} variant="ghost" size="sm" className="h-8 text-amber-600">
                           <Save className="size-4 mr-2" /> Add Note
                         </Button>
                       </div>
                       {ticket.internalNotes && ticket.internalNotes.length > 0 ? (
                         <div className="space-y-2">
                           {ticket.internalNotes.map((note: any, i: number) => (
                             <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                               <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.text}</p>
                               <p className="text-[10px] text-amber-600 mt-1">{note.authorName} · {format(new Date(note.timestamp), 'PPp')}</p>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <p className="text-center py-8 text-slate-400 text-sm">No internal notes yet.</p>
                       )}
                       <div className="pt-2">
                         {cannedResponses.length > 0 && (
                           <div className="mb-2">
                             <Select value={selectedCanned} onValueChange={applyCannedResponse}>
                               <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Insert canned response..." /></SelectTrigger>
                               <SelectContent>
                                 {cannedResponses.map(cr => <SelectItem key={cr.id} value={cr.id}>{cr.name}</SelectItem>)}
                               </SelectContent>
                             </Select>
                           </div>
                         )}
                         <textarea
                           className="w-full min-h-[80px] p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-sm focus:ring-1 focus:ring-amber-300"
                           placeholder="Add an internal note..."
                           value={internalNoteText}
                           onChange={e => setInternalNoteText(e.target.value)}
                           onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSaveInternalNote(); } }}
                         />
                       </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm ring-1 ring-slate-100">
            <CardHeader><CardTitle className="text-sm font-bold uppercase text-slate-400 tracking-widest">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              <ActivityFilter
                entries={timeline.map(t => ({ ...t, type: (t as any).type || 'other' as any }))}
                renderEntry={(item, i) => (
                  <div key={i} className="flex gap-6 relative z-10">
                    <div className={`h-6 w-6 rounded-full bg-white ring-2 ring-slate-100 flex items-center justify-center ${item.color}`}>
                      <item.icon className="size-3" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.event}</p>
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(item.date), 'PPpp')}</p>
                    </div>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-indigo-50">
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest">Ticket Intelligence</span>
              <Badge className="bg-indigo-400/50 text-white border-none">Validated</Badge>
            </div>
            <CardContent className="p-6 space-y-6">
               {/* SLA Timer */}
               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                   <Clock className="size-3" /> SLA Timer
                 </p>
                 <SLATimer ticket={ticket} />
               </div>

               {/* File Attachments */}
               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                   <Paperclip className="size-3" /> Attachments ({(ticket.attachments || []).length})
                 </p>
                 <FileUpload ticketId={ticket.id} />
               </div>

               <div className="grid grid-cols-1 gap-4">
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Priority Vector</p>
                   <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'secondary'} className="w-full justify-center py-2 text-sm">{(ticket.priority || 'medium').toUpperCase()}</Badge>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Category Segment</p>
                   <div className="flex items-center gap-2 font-bold text-slate-700"><Tag className="size-4 text-indigo-500" /> {ticket.category}</div>
                 </div>

                 {/* Tags */}
                 <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                     <Tag className="size-3" /> Tags
                   </p>
                   <TagInput tags={tags} onChange={handleTagsChange} suggestions={tagSuggestions} />
                 </div>
               </div>

               {/* Related Tickets */}
               <RelatedTicketsPanel ticketId={ticket.id} canUnlink={user?.role === 'supervisor' || user?.role === 'admin'} />

               <Separator />
               <div className="space-y-3">
                 <p className="text-xs font-bold text-slate-400 uppercase">Status Lifecycle</p>
                 <div className="grid gap-2">
                   {ticket.status === 'resolved' || ticket.status === 'reopened' ? (
                     <Button onClick={handleReopen} variant="outline" className="w-full h-12 rounded-xl">
                       <CheckCircle2 className="size-4 mr-2" /> Re-open Ticket
                     </Button>
                   ) : (
                     <Button onClick={() => updateTicketStatus(ticket.id, 'resolved')} className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl shadow-lg shadow-emerald-50">
                       <CheckCircle2 className="size-4 mr-2" /> Mark Resolved
                     </Button>
                   )}
                   {ticket.status === 'open' && <Button variant="outline" onClick={() => updateTicketStatus(ticket.id, 'in-progress')} className="w-full h-12 rounded-xl">Assign to Me</Button>}
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
                <div><p className="text-[10px] font-bold text-slate-400 uppercase">First Contact</p><p className="font-bold text-slate-900">{ticket.createdAt ? format(new Date(ticket.createdAt), 'MMM d, p') : 'N/A'}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// SLA Timer component with live countdown
function SLATimer({ ticket }: { ticket: any }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (ticket.status === 'resolved' || !ticket.slaRecordId) return;
    const interval = setInterval(() => setNow(Date.now()), 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [ticket.status, ticket.slaRecordId]);

  // Use slaRecord if available, otherwise fallback to ticket fields
  const deadline = ticket.slaRecord?.resolutionDeadline || ticket.resolutionDeadline;
  if (!deadline || ticket.status === 'resolved') {
    return (
      <Badge className="w-full justify-center py-3 text-sm bg-emerald-50 text-emerald-700 border-emerald-100">
        {ticket.status === 'resolved' ? '✓ Resolved within SLA' : 'No SLA configured'}
      </Badge>
    );
  }

  const deadlineMs = new Date(deadline).getTime();
  const remaining = deadlineMs - now;
  const total = deadlineMs - new Date(ticket.createdAt).getTime();
  const pct = total > 0 ? Math.max(0, (remaining / total) * 100) : 0;

  let color = 'text-emerald-600 bg-emerald-500/20';
  let barColor = 'bg-emerald-500';
  let label = `${formatDistanceToNow(new Date(deadline))} remaining`;

  if (remaining <= 0) {
    color = 'text-red-700 bg-red-500/20';
    barColor = 'bg-red-500';
    label = '⚠ SLA BREACHED';
  } else if (pct < 10) {
    color = 'text-red-600 bg-red-500/20 animate-pulse';
    barColor = 'bg-red-500';
    label = `${Math.ceil(remaining / 60000)}m remaining — CRITICAL`;
  } else if (pct < 50) {
    color = 'text-amber-600 bg-amber-500/20';
    barColor = 'bg-amber-500';
    label = `${Math.ceil(remaining / 60000)}m remaining`;
  }

  return (
    <div className="space-y-2">
      <div className={cn("rounded-lg px-3 py-2 text-center font-bold text-sm", color)}>
        {label}
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>Created</span>
        <span>{pct.toFixed(0)}% time used</span>
        <span>Deadline</span>
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// File Upload Component
function FileUpload({ ticketId }: { ticketId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    useTicketStore.subscribe(state => {
      const ticket = state.tickets.find(t => t.id === ticketId);
      if (ticket) setAttachments(ticket.attachments || []);
    });
  }, [ticketId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAttachments(prev => [...prev, data.data]);
        useTicketStore.getState().initialize();
      }
    } catch { /* ignore */ } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (key: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/tickets/${ticketId}/attachments/${key}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setAttachments(prev => prev.filter(a => a.key !== key));
      useTicketStore.getState().initialize();
    } catch { /* ignore */ }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (contentType: string) => contentType.startsWith('image/');

  return (
    <div className="space-y-2">
      <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*,.pdf,.txt,.csv,.doc,.docx" />
      <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        {uploading ? 'Uploading...' : <><Upload className="size-3 mr-1" /> Upload File</>}
      </Button>
      {attachments.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {attachments.map(a => (
            <div key={a.key} className="flex items-center gap-2 p-2 bg-white border rounded-lg text-xs">
              {isImage(a.contentType) ? (
                <img src={`/api/tickets/${ticketId}/attachments/${a.key}`} alt={a.filename} className="h-8 w-8 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0"><ExternalLink className="size-3" /></div>
              )}
              <a href={`/api/tickets/${ticketId}/attachments/${a.key}`} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate hover:text-indigo-600">
                {a.filename}
              </a>
              <span className="text-muted-foreground flex-shrink-0">{formatSize(a.size)}</span>
              <Button variant="ghost" size="icon" className="size-6 text-red-400 hover:text-red-600 flex-shrink-0" onClick={() => handleDelete(a.key)}>
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <KeyboardShortcutsHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}