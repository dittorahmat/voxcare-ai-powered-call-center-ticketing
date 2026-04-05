import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, Loader2, Save, Trash2, User, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTicketStore } from '@/store/ticketStore';
import { chatService } from '@/lib/chat';
import { toast } from 'sonner';
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}
export function LiveCall() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftTicket, setDraftTicket] = useState<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
  } | null>(null);
  const addTicket = useTicketStore(s => s.addTicket);
  const recognitionRef = React.useRef<any>(null);
  const handleStartCall = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech Recognition is not supported in this browser.");
      return;
    }
    setTranscript([]);
    setDraftTicket(null);
    setIsRecording(true);
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.onresult = (event: any) => {
      const result = event.results[event.results.length - 1][0].transcript;
      setTranscript(prev => [...prev, result]);
    };
    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech Recognition Error", event.error);
      if (event.error !== 'no-speech') {
        setIsRecording(false);
        toast.error("Microphone error. Please check permissions.");
      }
    };
    recognitionRef.current.start();
    toast.info("Recording started. Transcribing live audio...");
  }, []);
  const handleEndCall = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    if (transcript.length < 2) {
      toast.warning("Transcript is too short for meaningful analysis.");
      return;
    }
    setIsAnalyzing(true);
    const fullText = transcript.join('\n');
    try {
      const systemPrompt = `You are a call center analyzer. Extract ticket details from this transcript. 
      Output ONLY a JSON object with: { "title": string, "description": string, "priority": "low" | "medium" | "high" | "urgent", "category": string }.
      The description should be a concise summary.`;
      const response = await chatService.sendMessage(
        `TRANSCRIPT:\n${fullText}\n\nAnalyze this and return JSON as requested.`,
        'google-ai-studio/gemini-2.5-flash'
      );
      if (response.success && response.data?.messages) {
        const lastMsg = response.data.messages[response.data.messages.length - 1];
        const jsonMatch = lastMsg.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extracted = JSON.parse(jsonMatch[0]);
          setDraftTicket(extracted);
          toast.success("AI Analysis Complete!");
        } else {
          throw new Error("Invalid AI response format");
        }
      } else {
        throw new Error(response.error || "AI failed to respond");
      }
    } catch (error) {
      console.error("AI Extraction Error:", error);
      toast.error("AI Analysis failed. Please enter details manually.");
      setDraftTicket({
        title: "Manual Entry Required",
        description: "AI failed to summarize. Original transcript available below.",
        priority: "medium",
        category: "General"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handleSaveTicket = () => {
    if (!draftTicket) return;
    const newTicket = {
      id: `T-${Math.floor(Math.random() * 9000 + 1000)}`,
      customerName: "New Caller",
      title: draftTicket.title,
      description: draftTicket.description,
      priority: draftTicket.priority,
      status: 'open' as const,
      category: draftTicket.category,
      createdAt: new Date().toISOString(),
      transcript: transcript.join('\n')
    };
    addTicket(newTicket);
    setDraftTicket(null);
    setTranscript([]);
    toast.success("Ticket created successfully!");
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in h-[calc(100vh-12rem)] min-h-[600px]">
      <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Voice Intake</h1>
            <p className="text-muted-foreground">Capture live customer calls with AI transcription.</p>
          </div>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse gap-1.5 px-3 py-1">
              <div className="h-2 w-2 rounded-full bg-white" />
              LIVE RECORDING
            </Badge>
          )}
        </div>
        <Card className="flex-1 flex flex-col border-none shadow-sm bg-white overflow-hidden relative">
          <CardHeader className="border-b border-slate-50 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-400">Live Transcript</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="size-3" />
                <span>Customer Connected</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
            {transcript.length === 0 && !isRecording && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <Mic className="size-8" />
                </div>
                <div>
                  <p className="font-medium text-slate-500">No active transcription</p>
                  <p className="text-sm text-slate-400">Start a recording to begin voice processing.</p>
                </div>
              </div>
            )}
            <AnimatePresence>
              {transcript.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={i % 2 === 0 ? "bg-slate-50 p-3 rounded-lg mr-8" : "bg-indigo-50 p-3 rounded-lg ml-8 text-right"}
                >
                  <p className="text-sm text-slate-800">{line}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
          <div className="p-6 border-t border-slate-50 shrink-0 flex gap-4">
            {!isRecording ? (
              <Button
                onClick={handleStartCall}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 text-lg font-bold gap-2 shadow-lg shadow-indigo-200"
              >
                <Mic className="size-5" /> Start Recording
              </Button>
            ) : (
              <Button
                onClick={handleEndCall}
                variant="destructive"
                className="flex-1 h-12 text-lg font-bold gap-2 shadow-lg shadow-red-200"
              >
                <PhoneOff className="size-5" /> End & Analyze
              </Button>
            )}
          </div>
        </Card>
      </div>
      <div className="flex flex-col h-full">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Sparkles className="size-5 text-indigo-600" />
          AI Auto-Extraction
        </h2>
        <div className="flex-1 overflow-y-auto">
          {isAnalyzing ? (
            <div className="space-y-6">
              <Card className="animate-pulse border-none shadow-sm h-32 bg-slate-100/50" />
              <Card className="animate-pulse border-none shadow-sm h-64 bg-slate-100/50" />
              <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
                <Loader2 className="animate-spin size-5" />
                <span>Processing intelligence...</span>
              </div>
            </div>
          ) : draftTicket ? (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-none shadow-lg shadow-indigo-100/50 bg-white ring-1 ring-indigo-100">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-indigo-600">Draft Ticket</Badge>
                    <Badge variant={draftTicket.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize">
                      {draftTicket.priority} Priority
                    </Badge>
                  </div>
                  <CardTitle>Review AI Insights</CardTitle>
                  <CardDescription>Verify the extracted details before finalizing.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Title</label>
                    <Input value={draftTicket.title} onChange={(e) => setDraftTicket({...draftTicket, title: e.target.value})} className="font-semibold bg-slate-50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                    <Input value={draftTicket.category} onChange={(e) => setDraftTicket({...draftTicket, category: e.target.value})} className="bg-slate-50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Summary</label>
                    <Textarea value={draftTicket.description} onChange={(e) => setDraftTicket({...draftTicket, description: e.target.value})} className="min-h-[120px] resize-none bg-slate-50 leading-relaxed" />
                  </div>
                  <div className="pt-4 flex gap-3">
                    <Button onClick={handleSaveTicket} className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold gap-2">
                      <Save className="size-4" /> Save Ticket
                    </Button>
                    <Button variant="outline" onClick={() => setDraftTicket(null)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="h-full rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-60">
              <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                <Sparkles className="size-6" />
              </div>
              <div className="max-w-[240px]">
                <p className="font-semibold text-slate-500">AI Draft Ready</p>
                <p className="text-sm text-slate-400">After you end a call, AI will automatically populate ticket details here.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}