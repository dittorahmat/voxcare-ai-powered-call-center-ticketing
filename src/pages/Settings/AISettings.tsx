import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Brain, Save, Check } from 'lucide-react';
import { apiPut } from '@/lib/apiClient';

const MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
];

export function AISettings() {
  const [model, setModel] = useState('gemini-2.5-flash');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [promptTemplate, setPromptTemplate] = useState('Extract ticket fields from the following transcript:');
  const [tools, setTools] = useState<string[]>(['weather', 'web_search']);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleTool = (tool: string) => {
    setTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut('/api/settings/ai', { defaultModel: model, temperature, maxTokens, promptTemplate, toolsEnabled: tools });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Brain className="size-5" /> AI Configuration</CardTitle>
        <CardDescription>Configure the AI model and ticket extraction behavior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Default Model</Label>
          <select value={model} onChange={e => setModel(e.target.value)} className="w-full max-w-md h-10 px-3 rounded-md border border-input bg-background text-sm">
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-6 max-w-md">
          <div className="space-y-2">
            <Label>Temperature</Label>
            <Input type="number" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input type="number" min={256} step={256} value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Ticket Extraction Prompt Template</Label>
          <Textarea value={promptTemplate} onChange={e => setPromptTemplate(e.target.value)} className="min-h-[100px]" />
        </div>
        <div className="space-y-3">
          <Label>Enabled Tools</Label>
          <div className="space-y-2">
            {[
              { id: 'weather', label: 'Weather Lookup' },
              { id: 'web_search', label: 'Web Search (SerpAPI)' },
            ].map(tool => (
              <div key={tool.id} className="flex items-center justify-between max-w-md">
                <span className="text-sm">{tool.label}</span>
                <Switch checked={tools.includes(tool.id)} onCheckedChange={() => toggleTool(tool.id)} />
              </div>
            ))}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saved ? <Check className="size-4 mr-2" /> : <Save className="size-4 mr-2" />}
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save AI Config'}
        </Button>
      </CardContent>
    </Card>
  );
}
