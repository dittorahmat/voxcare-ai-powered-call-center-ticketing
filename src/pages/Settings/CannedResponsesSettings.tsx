import React, { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Check, MessageSquare } from 'lucide-react';

interface CannedResponse {
  id: string;
  name: string;
  body: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export function CannedResponsesSettings() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [editing, setEditing] = useState<CannedResponse | null>(null);
  const [newName, setNewName] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('General');

  useEffect(() => {
    apiGet<{ success: boolean; data: CannedResponse[] }>('/api/canned-responses')
      .then(res => { if (res.success) setResponses(res.data || []); })
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!newName || !newBody) return;
    try {
      const res = await apiPost<{ success: boolean; data: CannedResponse }>('/api/canned-responses', {
        name: newName, body: newBody, category: newCategory,
      });
      if (res.success) {
        setResponses(prev => [...prev, res.data]);
        setNewName(''); setNewBody('');
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/canned-responses/${id}`);
      setResponses(prev => prev.filter(r => r.id !== id));
    } catch { /* ignore */ }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      const res = await apiPut(`/api/canned-responses/${editing.id}`, editing);
      if (res.success) {
        setResponses(prev => prev.map(r => r.id === editing.id ? res.data : r));
        setEditing(null);
      }
    } catch { /* ignore */ }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageSquare className="size-5" /> Canned Responses</CardTitle>
        <CardDescription>Reply templates for agents. Variables: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{`{{customer_name}}`}</code> <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{`{{ticket_id}}`}</code> <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">{`{{agent_name}}`}</code></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase">New Template</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Greeting" /></div>
            <div className="space-y-2"><Label>Category</Label><Input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="General" /></div>
          </div>
          <div className="space-y-2"><Label>Body</Label><Textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Hello {{customer_name}}, thank you for contacting us..." rows={3} /></div>
          <Button onClick={handleCreate} size="sm" disabled={!newName || !newBody}><Plus className="size-4 mr-1" /> Create</Button>
        </div>

        {/* Edit dialog */}
        {editing && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <p className="text-xs font-bold text-amber-600 uppercase">Editing: {editing.name}</p>
            <Textarea value={editing.body} onChange={e => setEditing({ ...editing, body: e.target.value })} rows={3} />
            <div className="flex gap-2">
              <Button onClick={handleUpdate} size="sm"><Check className="size-4 mr-1" /> Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* List */}
        {responses.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {responses.map(r => (
              <div key={r.id} className="py-3 flex items-start justify-between group">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{r.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{r.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.body}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(r)}><MessageSquare className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="size-8 text-red-500" onClick={() => handleDelete(r.id)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No canned responses yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
