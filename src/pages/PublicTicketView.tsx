import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, Star, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/apiClient';
import { toast } from 'sonner';

interface PublicTicketData {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  resolvedAt: string | null;
  description: string;
  publicNotes: { text: string; authorName: string; timestamp: string } | null;
  attachments: { filename: string; contentType: string; size: number; uploadedAt: string }[];
  csatSubmitted: boolean;
}

const statusColors: Record<string, string> = {
  'open': 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-yellow-100 text-yellow-800',
  'resolved': 'bg-green-100 text-green-800',
  'reopened': 'bg-orange-100 text-orange-800',
  'closed': 'bg-gray-100 text-gray-800',
  'merged': 'bg-purple-100 text-purple-800',
};

export function PublicTicketView() {
  const { token } = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<PublicTicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchTicket() {
      try {
        const res = await apiGet(`/api/public/ticket/${token}`);
        if (res.success) setTicket(res.data);
      } catch (err) {
        console.error('Failed to fetch public ticket:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [token]);

  const handleSubmitCSAT = async () => {
    if (!rating || !ticket) return;
    setSubmitting(true);
    try {
      const res = await apiPost('/api/csat', {
        ticketId: ticket.id,
        rating,
        comment: comment || null,
        customerEmail: '',
      });
      if (res.success) {
        setSubmitted(true);
        toast({ title: 'Terima kasih!', description: 'Rating Anda telah disimpan.' });
      }
    } catch (err) {
      toast({ title: 'Gagal', description: 'Terjadi kesalahan saat mengirim rating.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Ticket Tidak Ditemukan</h2>
            <p className="text-muted-foreground">Link yang Anda akses tidak valid atau sudah kadaluarsa.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{ticket.title}</CardTitle>
              <Badge className={statusColors[ticket.status] || 'bg-gray-100 text-gray-800'}>
                {ticket.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Ticket #{ticket.id} · Dibuat {new Date(ticket.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              {ticket.resolvedAt && ` · Resolved ${new Date(ticket.resolvedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Kategori</Label>
              <p className="text-sm text-muted-foreground">{ticket.category}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Deskripsi</Label>
              <p className="text-sm mt-1">{ticket.description}</p>
            </div>
            {ticket.publicNotes && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Catatan Publik</Label>
                  <p className="text-sm mt-1 bg-muted p-3 rounded-md">{ticket.publicNotes.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    oleh {ticket.publicNotes.authorName} · {new Date(ticket.publicNotes.timestamp).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </>
            )}
            {ticket.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium">Lampiran ({ticket.attachments.length})</Label>
                  <ul className="text-sm mt-1 space-y-1">
                    {ticket.attachments.map((a, i) => (
                      <li key={i} className="text-muted-foreground">📎 {a.filename} ({(a.size / 1024).toFixed(1)} KB)</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* CSAT Survey */}
        {ticket.status === 'resolved' && !ticket.csatSubmitted && !submitted && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bagaimana pengalaman Anda?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <>
                  <div>
                    <Label htmlFor="csat-comment">Komentar (opsional)</Label>
                    <Textarea
                      id="csat-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Ceritakan pengalaman Anda..."
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleSubmitCSAT} disabled={submitting} className="w-full">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Kirim Rating
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {submitted && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-green-800">Terima kasih atas feedback Anda!</h3>
              <p className="text-sm text-green-600">Rating Anda telah kami terima dan akan membantu meningkatkan layanan kami.</p>
            </CardContent>
          </Card>
        )}

        {ticket.csatSubmitted && !submitted && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-blue-600">Anda sudah memberikan rating untuk ticket ini. Terima kasih!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
