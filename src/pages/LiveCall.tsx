import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Sparkles, Save, Trash2, PhoneOff, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTicketStore } from '@/store/ticketStore';
import { chatService } from '@/lib/chat';
import { apiPost } from '@/lib/apiClient';
import { toast } from 'sonner';
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
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);
  useEffect(() => {
    if (!isRecording || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let offset = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + Math.sin(x * 0.05 + offset) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      offset += 0.15;
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isRecording]);
  const handleStartCall = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Browser not supported for speech recognition.");
      return;
    }
    setTranscript([]);
    setDraftTicket(null);
    setIsRecording(true);
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript;
      setTranscript(prev => [...prev, text]);
    };
    recognitionRef.current.start();
  }, []);
  const handleEndCall = async () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    if (transcript.length < 1) return;
    setIsAnalyzing(true);
    try {
      const prompt = `Extract ticket details: { "title": string, "description": string, "priority": "low"|"medium"|"high"|"urgent", "category": string }. Transcript:\n${transcript.join('\n')}`;
      const res = await chatService.sendMessage(prompt, 'google-ai-studio/gemini-2.5-flash');
      if (res.success && res.data?.messages) {
        const content = res.data.messages[res.data.messages.length - 1].content;
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const extracted = JSON.parse(match[0]);
          setDraftTicket(extracted);
          toast.success("AI extraction complete.");
        } else {
          toast.error("AI returned invalid format.");
        }
      }
    } catch (e) {
      toast.error("AI failed to parse interaction.");
    } finally {
      setIsAnalyzing(false);
    }
  };
  const onSave = async () => {
    if (!draftTicket) return;
    const ticketId = `T-${Math.floor(Math.random()*9000+1000)}`;
    const transcriptText = transcript.join('\n');

    // Save ticket
    await addTicket({
      id: ticketId,
      ...draftTicket,
      customerName: "Recent Caller",
      status: 'open',
      createdAt: new Date().toISOString(),
      transcript: transcriptText
    });

    // Save call record
    try {
      await apiPost('/api/calls', {
        callId: crypto.randomUUID(),
        callerNumber: null,
        agentId: null,
        ticketId,
        status: 'ended',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: null,
        transcript: transcriptText,
        outcome: 'Ticket created via AI intake',
      });
    } catch {
      // Call record save failure shouldn't block ticket save
      console.warn('Failed to save call record');
    }

    setDraftTicket(null);
    setTranscript([]);
    toast.success("Ticket saved to cloud.");
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12 min-h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 h-full">
        <div className="flex flex-col gap-6 h-full">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Voice Intake</h1>
            {isRecording && <Badge variant="destructive" className="animate-pulse">Live Call</Badge>}
          </div>
          <Card className="flex-1 flex flex-col border-none shadow-xl bg-white overflow-hidden min-h-[500px]">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center h-12">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transcription Feed</span>
              {isRecording && <canvas ref={canvasRef} width={100} height={30} className="rounded" />}
            </div>
            <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {transcript.length === 0 && !isRecording && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                  <Mic className="size-16 mb-4" />
                  <p>Ready to record...</p>
                </div>
              )}
              {transcript.map((line, i) => (
                <motion.div initial={{ opacity: 0, x: i%2===0?20:-20 }} animate={{ opacity: 1, x: 0 }} key={i} className={`p-4 rounded-2xl max-w-[85%] ${i%2===0?'bg-indigo-50 mr-auto text-indigo-900':'bg-slate-100 ml-auto text-slate-800'}`}>
                  <p className="text-sm font-medium opacity-50 mb-1">{i%2===0?'Agent':'Customer'}</p>
                  <p className="text-sm leading-relaxed">{line}</p>
                </motion.div>
              ))}
            </CardContent>
            <div className="p-6 border-t bg-slate-50">
              <Button onClick={isRecording ? handleEndCall : handleStartCall} variant={isRecording ? 'destructive' : 'default'} className={`w-full h-16 text-lg font-bold rounded-2xl transition-all shadow-lg ${!isRecording ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'shadow-red-200'}`}>
                {isRecording ? <><PhoneOff className="mr-2" /> Finish Call & Analyze</> : <><Mic className="mr-2" /> Start Voice Recording</>}
              </Button>
            </div>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-indigo-600 size-6" />
            <h2 className="text-2xl font-bold">AI Workbench</h2>
          </div>
          <div className="flex-1">
            {isAnalyzing ? (
              <div className="space-y-6">
                 <Skeleton className="h-[200px] w-full rounded-2xl" />
                 <Skeleton className="h-[400px] w-full rounded-2xl" />
                 <div className="text-center text-muted-foreground animate-pulse">Deep analysis in progress...</div>
              </div>
            ) : draftTicket ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-none shadow-2xl ring-1 ring-indigo-100">
                  <CardHeader className="bg-indigo-50/50 rounded-t-2xl">
                    <CardTitle>Extracted Draft</CardTitle>
                    <CardDescription>AI has suggested the following ticket structure.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Priority</label>
                          <Badge className="w-full justify-center py-2 capitalize" variant={draftTicket.priority === 'urgent' ? 'destructive' : 'secondary'}>{draftTicket.priority}</Badge>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                          <Input value={draftTicket.category} onChange={e => setDraftTicket({...draftTicket, category: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Subject</label>
                        <Input value={draftTicket.title} onChange={e => setDraftTicket({...draftTicket, title: e.target.value})} className="font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Executive Summary</label>
                        <Textarea className="min-h-[150px] leading-relaxed resize-none" value={draftTicket.description} onChange={e => setDraftTicket({...draftTicket, description: e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={onSave} className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 font-bold"><Save className="mr-2 size-4" /> Finalize Ticket</Button>
                      <Button variant="outline" size="icon" className="h-12 w-12 text-red-500" onClick={() => setDraftTicket(null)}><Trash2 className="size-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-12 text-slate-400 min-h-[400px]">
                <Sparkles className="size-12 mb-4 opacity-20" />
                <p className="font-medium">Analysis Stage</p>
                <p className="text-sm">End a call to trigger automatic ticket extraction here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}