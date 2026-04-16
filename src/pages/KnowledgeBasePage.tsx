import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface KnowledgeArticle {
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

export function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadArticles();
  }, [search, selectedCategory]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (search) params.set('search', search);
      const res = await apiGet<{ success: boolean; data: KnowledgeArticle[] }>(`/api/knowledge-base/articles?${params}`);
      if (res.success) {
        setArticles(res.data);
        const cats = [...new Set(res.data.map(a => a.category))];
        setCategories(cats);
      }
    } catch {
      // KB may not be available yet
      setArticles([]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Pusat Bantuan VoxCare</h1>
          <p className="text-lg text-indigo-100 mb-8">Temukan jawaban untuk pertanyaan umum Anda</p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              className="pl-10 h-12 text-lg bg-white/10 border-white/20 text-white placeholder:text-white/60"
              placeholder="Cari artikel bantuan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Kategori</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Button
                  variant={selectedCategory === '' ? 'secondary' : 'ghost'}
                  className="w-full justify-start text-sm"
                  onClick={() => setSelectedCategory('')}
                >
                  Semua
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-sm"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="flex-1">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>
                  {search ? `Hasil pencarian: "${search}"` : 'Semua Artikel'}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({articles.length} artikel)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Memuat...</p>
                ) : articles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Tidak ada artikel ditemukan.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {articles.map(article => (
                      <Link
                        key={article.id}
                        to={`/kb/${article.id}`}
                        className="block p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition border"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-base mb-1">{article.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {article.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs">{article.category}</Badge>
                              {article.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground ml-4">
                            {article.helpfulCount > 0 && (
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" /> {article.helpfulCount}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {format(new Date(article.updatedAt), 'dd MMM yyyy')}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KnowledgeBaseArticlePage() {
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    if (id) {
      apiGet<{ success: boolean; data: KnowledgeArticle }>(`/api/knowledge-base/articles/${id}`)
        .then(res => { if (res.success) setArticle(res.data); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const handleFeedback = async (helpful: boolean) => {
    if (!article || feedback) return;
    try {
      await apiPost(`/api/knowledge-base/articles/${article.id}/feedback`, { helpful });
      setFeedback(helpful ? 'helpful' : 'not-helpful');
    } catch {}
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  if (!article) return <div className="min-h-screen flex items-center justify-center">Artikel tidak ditemukan</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/kb" className="text-sm text-muted-foreground hover:text-foreground">
            ← Kembali ke Pusat Bantuan
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge>{article.category}</Badge>
              {article.tags.map(tag => (
                <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
              ))}
            </div>
            <CardTitle className="text-2xl">{article.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Diperbarui {format(new Date(article.updatedAt), 'dd MMMM yyyy')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            <div className="flex items-center gap-4 pt-4 border-t">
              <span className="text-sm font-medium">Apakah artikel ini membantu?</span>
              {!feedback ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleFeedback(true)}>
                    <ThumbsUp className="h-4 w-4 mr-1" /> Ya
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleFeedback(false)}>
                    <ThumbsDown className="h-4 w-4 mr-1" /> Tidak
                  </Button>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Terima kasih atas masukan Anda!
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
