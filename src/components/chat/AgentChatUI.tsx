import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, apiPatch } from '@/lib/apiClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, ArrowRight, Send, Paperclip, Loader2, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';

interface ChatSession {
  id: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  agentId: string | null;
  state: string;
  aiSummary: string | null;
  suggestedCategory: string | null;
  suggestedPriority: string | null;
  typingIndicator: { customer: boolean; agent: boolean };
  createdAt: string;
  closedAt: string | null;
  ticketId: string | null;
}

interface ChatMessage {
  id: string;
  chatId: string;
  sender: string;
  text: string;
  attachments: any[];
  timestamp: string;
  read: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

// ─── Agent Chat Queue Panel ──────────────────────────────

export function AgentChatQueuePanel({ onAcceptChat }: { onAcceptChat: (chatId: string) => void }) {
  const [waitingChats, setWaitingChats] = useState<ChatSession[]>([]);
  const [activeChats, setActiveChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChats = () => {
    apiGet<{ success: boolean; data: ChatSession[] }>('/api/chat-sessions/queue')
      .then(res => { if (res.success) setWaitingChats(res.data); })
      .catch(() => {});
    // Active chats for current agent
    apiGet<{ success: boolean; data: ChatSession[] }>('/api/chat-sessions')
      .then(res => { if (res.success) setActiveChats((res.data || []).filter(c => c.state === 'active')); })
      .catch(() => {});
  };

  useEffect(() => { loadChats(); setLoading(false); }, []);

  // Poll for new waiting chats
  useEffect(() => {
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Live Chat Queue ({waitingChats.length} waiting)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {waitingChats.length === 0 && activeChats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No active chats</p>
        ) : (
          <div className="space-y-2">
            {waitingChats.map(chat => (
              <div key={chat.id} className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{chat.customerName || 'Anonymous'}</span>
                      {chat.customerEmail && (
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">{chat.customerEmail}</span>
                      )}
                      {chat.suggestedPriority && (
                        <Badge className={`${PRIORITY_COLORS[chat.suggestedPriority] || ''} text-[10px]`}>
                          {chat.suggestedPriority}
                        </Badge>
                      )}
                    </div>
                    {chat.aiSummary && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{chat.aiSummary}</p>
                    )}
                    {chat.suggestedCategory && (
                      <p className="text-xs text-muted-foreground mt-0.5">{chat.suggestedCategory}</p>
                    )}
                  </div>
                  <Button size="sm" className="ml-2" onClick={() => onAcceptChat(chat.id)}>
                    <Check className="h-4 w-4 mr-1" /> Accept
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Agent Live Chat Interface ───────────────────────────

export function AgentLiveChat({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [saveAsTicket, setSaveAsTicket] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Load initial messages
    apiGet<{ success: boolean; data: ChatMessage[] }>(`/api/chat-sessions/${chatId}/messages`)
      .then(res => { if (res.success) setMessages(res.data); })
      .catch(() => {});

    // SSE for real-time messages
    const evtSource = new EventSource(`/api/chat-sessions/${chatId}/stream`);
    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setMessages(prev => {
            if (prev.find(m => m.id === data.data.id)) return prev;
            return [...prev, data.data];
          });
        }
      } catch { /* heartbeat or invalid */ }
    };

    return () => evtSource.close();
  }, [chatId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    if (!typing) {
      setTyping(true);
      apiPost(`/api/chat-sessions/${chatId}/typing`, { sender: 'agent', isTyping: true }).catch(() => {});
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(false);
      apiPost(`/api/chat-sessions/${chatId}/typing`, { sender: 'agent', isTyping: false }).catch(() => {});
    }, 2000);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      await apiPost(`/api/chat-sessions/${chatId}/messages`, { sender: 'agent', text: input.trim() });
      setInput('');
    } catch { toast.error('Failed to send message'); }
    setSending(false);
  };

  const handleCloseChat = async () => {
    setClosing(true);
    try {
      await apiPost(`/api/chat-sessions/${chatId}/close`, { saveAsTicket });
      toast.success(saveAsTicket ? 'Chat closed and ticket created' : 'Chat closed');
      onClose();
    } catch { toast.error('Failed to close chat'); }
    setClosing(false);
  };

  return (
    <Card className="border-none shadow-sm flex flex-col h-[600px]">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">Live Chat</CardTitle>
          <p className="text-xs text-muted-foreground">Customer is waiting for response</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setShowCloseDialog(true)}>
          <PhoneOff className="h-4 w-4 mr-1" /> End Chat
        </Button>
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="space-y-3 py-2">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-lg text-sm ${
                msg.sender === 'agent' ? 'bg-indigo-600 text-white' :
                msg.sender === 'ai' ? 'bg-amber-100 text-amber-900' :
                'bg-slate-100 text-slate-900'
              }`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.attachments?.length > 0 && (
                  <div className="mt-1 text-xs opacity-75">
                    📎 {msg.attachments.map((a: any) => a.filename).join(', ')}
                  </div>
                )}
                <p className={`text-[10px] mt-1 ${msg.sender === 'agent' ? 'text-indigo-200' : 'text-muted-foreground'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Textarea
          value={input}
          onChange={e => { setInput(e.target.value); handleTyping(); }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Type a message..."
          className="min-h-[40px] resize-none"
        />
        <Button size="icon" onClick={sendMessage} disabled={sending || !input.trim()}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Close Dialog */}
      {showCloseDialog && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-80">
            <CardHeader><CardTitle className="text-sm">End Chat</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveTicket"
                  checked={saveAsTicket}
                  onChange={e => setSaveAsTicket(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="saveTicket" className="text-sm">Save as ticket</label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={handleCloseChat} disabled={closing}>
                  {closing ? 'Closing...' : 'End Chat'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
