import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/apiClient';

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  published: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  updatedAt: string;
}

export function KnowledgeBaseSettings() {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<KBArticle | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Umum');
  const [tags, setTags] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadArticles(); }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ success: boolean; data: KBArticle[] }>('/api/knowledge-base/articles');
      if (res.success) setArticles(res.data);
    } catch { toast.error('Failed to load articles'); }
    setLoading(false);
  };

  const resetForm = () => {
    setTitle(''); setContent(''); setCategory('Umum'); setTags(''); setPublished(false);
    setEditing(null); setShowForm(false);
  };

  const handleEdit = (article: KBArticle) => {
    setEditing(article);
    setTitle(article.title); setContent(article.content); setCategory(article.category);
    setTags(article.tags.join(', ')); setPublished(article.published);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) { toast.error('Title and content required'); return; }
    setSaving(true);
    try {
      const body = { title: title.trim(), content: content.trim(), category, tags: tags.split(',').map(t => t.trim()).filter(Boolean), published };
      if (editing) {
        await apiPut(`/api/knowledge-base/articles/${editing.id}`, body);
        toast.success('Article updated');
      } else {
        await apiPost('/api/knowledge-base/articles', body);
        toast.success('Article created');
      }
      resetForm();
      loadArticles();
    } catch { toast.error('Failed to save article'); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    try {
      await apiDelete(`/api/knowledge-base/articles/${id}`);
      toast.success('Article deleted');
      loadArticles();
    } catch { toast.error('Failed to delete'); }
  };

  const togglePublished = async (article: KBArticle) => {
    try {
      await apiPut(`/api/knowledge-base/articles/${article.id}`, { published: !article.published });
      loadArticles();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Knowledge Base</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Article
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? 'Edit Article' : 'New Article'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Judul</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Cara Reset Password" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori</label>
                <Input value={category} onChange={e => setCategory(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tag (pisahkan dengan koma)</label>
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="password, login, akun" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Konten (Markdown)</label>
              <Textarea value={content} onChange={e => setContent(e.target.value)} className="min-h-[200px]" placeholder="## Langkah 1\nBuka halaman settings..." />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={published} onCheckedChange={setPublished} />
                <span className="text-sm">{published ? 'Dipublikasikan' : 'Draft'}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm}>Batal</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Artikel ({articles.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Memuat...</p>
          ) : articles.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Belum ada artikel.</p>
          ) : (
            <div className="space-y-2">
              {articles.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{a.title}</span>
                      <Badge variant={a.published ? 'default' : 'secondary'} className="text-[10px]">
                        {a.published ? 'Published' : 'Draft'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{a.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.tags.map(t => `#${t}`).join(' ')} · {a.helpfulCount} 👍 {a.notHelpfulCount} 👎
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublished(a)}>
                      {a.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(a)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
