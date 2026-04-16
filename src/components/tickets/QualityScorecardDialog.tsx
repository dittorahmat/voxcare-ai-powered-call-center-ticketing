import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiPost } from '@/lib/apiClient';

interface QualityScorecardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  onScored?: () => void;
}

export function QualityScorecardDialog({ open, onOpenChange, ticketId, onScored }: QualityScorecardDialogProps) {
  const [accuracy, setAccuracy] = useState(3);
  const [tone, setTone] = useState(3);
  const [resolution, setResolution] = useState(3);
  const [professionalism, setProfessionalism] = useState(3);
  const [overall, setOverall] = useState(3);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setAccuracy(3); setTone(3); setResolution(3); setProfessionalism(3); setOverall(3); setComments('');
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await apiPost('/api/quality/scorecards', {
        ticketId, accuracy, tone, resolution, professionalism, overall, comments: comments || null,
      });
      if (res.success) {
        toast.success('Quality scorecard saved');
        onScored?.();
        onOpenChange(false);
        reset();
      }
    } catch {
      toast.error('Failed to save scorecard');
    }
    setSaving(false);
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-1 hover:scale-110 transition"
          >
            <Star className={`h-6 w-6 ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quality Scorecard — {ticketId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <StarRating value={accuracy} onChange={setAccuracy} label="Accuracy (Informasi yang benar)" />
          <StarRating value={tone} onChange={setTone} label="Tone (Sikap & Empati)" />
          <StarRating value={resolution} onChange={setResolution} label="Resolution (Penyelesaian masalah)" />
          <StarRating value={professionalism} onChange={setProfessionalism} label="Professionalism (Proses & Tata bahasa)" />
          <StarRating value={overall} onChange={setOverall} label="Overall Score" />
          <div className="space-y-2">
            <Label>Comments (opsional)</Label>
            <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Catatan tambahan..." className="min-h-[80px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>Batal</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {saving ? 'Menyimpan...' : 'Simpan Scorecard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
