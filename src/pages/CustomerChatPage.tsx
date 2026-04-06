import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/CustomerAuthContext';

interface ChatMessage {
  id: string;
  chatId: string;
  sender: string;
  text: string;
  attachments: any[];
  timestamp: string;
}

export function CustomerChatPage() {
  const { user } = useCustomerAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Create or resume chat session with customer identity
    const customerName = user?.name || 'Pelanggan';
    const customerEmail = user?.email || null;
    const customerId = user?.id || null;
    apiPost('/api/chat-sessions', { customerId, customerName, customerEmail })
      .then(res => {
        if (res.success) {
          setSessionId(res.data.id);
          // Load existing messages
          apiGet<{ success: boolean; data: ChatMessage[] }>(`/api/chat-sessions/${res.data.id}/messages`)
            .then(msgRes => { if (msgRes.success) setMessages(msgRes.data); })
            .catch(() => {});
        }
      })
      .catch(() => toast.error('Failed to start chat'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    // SSE for real-time messages
    const evtSource = new EventSource(`/api/chat-sessions/${sessionId}/stream`);
    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'message') {
          setMessages(prev => {
            if (prev.find(m => m.id === data.data.id)) return prev;
            return [...prev, data.data];
          });
        }
      } catch { /* heartbeat */ }
    };

    return () => evtSource.close();
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    if (!typing && sessionId) {
      setTyping(true);
      apiPost(`/api/chat-sessions/${sessionId}/typing`, { sender: 'customer', isTyping: true }).catch(() => {});
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(false);
      if (sessionId) apiPost(`/api/chat-sessions/${sessionId}/typing`, { sender: 'customer', isTyping: false }).catch(() => {});
    }, 2000);
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Add local message
    const localMsg = { id: `local-${Date.now()}`, sender: 'customer', text, timestamp: new Date().toISOString(), chatId: sessionId, attachments: [], read: false };
    setMessages(prev => [...prev, localMsg]);

    try {
      const res = await apiPost(`/api/chat-sessions/${sessionId}/chat`, { message: text });
      if (res.success && res.data.reply) {
        // AI response
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`, sender: 'ai', text: res.data.reply,
          timestamp: new Date().toISOString(), chatId: sessionId, attachments: [], read: false,
        }]);
        if (res.data.readyForAgent) {
          setMessages(prev => [...prev, {
            id: `sys-${Date.now()}`, sender: 'system', text: 'Connecting you with an agent...',
            timestamp: new Date().toISOString(), chatId: sessionId, attachments: [], read: false,
          }]);
        }
      }
    } catch { toast.error('Failed to send message'); }
    setSending(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading chat...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/customer/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
            <span className="font-bold text-lg">VoxCare Support Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">Online</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-4">
        <Card className="border-none shadow-sm h-[calc(100vh-140px)] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">How can we help you today?</CardTitle>
          </CardHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="space-y-3 py-2">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-lg text-sm ${
                    msg.sender === 'customer' ? 'bg-indigo-600 text-white' :
                    msg.sender === 'ai' ? 'bg-amber-100 text-amber-900' :
                    msg.sender === 'system' ? 'bg-slate-100 text-slate-500 text-center text-xs' :
                    'bg-slate-100 text-slate-900'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender === 'customer' ? 'text-indigo-200' : 'text-muted-foreground'}`}>
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
              placeholder="Type your message..."
              className="min-h-[40px] resize-none"
            />
            <Button size="icon" onClick={sendMessage} disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
