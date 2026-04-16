import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FileText, User, Headphones, MessageCircle } from 'lucide-react';

interface ReplyAttachment {
  key: string;
  filename: string;
  contentType: string;
  size: number;
}

interface Reply {
  id: string;
  sender: 'customer' | 'agent' | 'system';
  senderName: string;
  text: string;
  attachments?: ReplyAttachment[];
  timestamp: string;
}

interface ConversationThreadProps {
  replies: Reply[];
  className?: string;
}

const SENDER_COLORS = {
  customer: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  agent: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  system: { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-500' },
};

const SENDER_ICONS = {
  customer: User,
  agent: Headphones,
  system: FileText,
};

function getChannel(reply: { id: string }): 'whatsapp' | 'default' {
  return reply.id.startsWith('reply-wa-') ? 'whatsapp' : 'default';
}

export function ConversationThread({ replies, className }: ConversationThreadProps) {
  if (!replies?.length) {
    return (
      <div className={cn('text-sm text-muted-foreground text-center py-8', className)}>
        Belum ada balasan. Mulai percakapan di bawah.
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {replies.map((reply, index) => {
        const colors = SENDER_COLORS[reply.sender];
        const Icon = SENDER_ICONS[reply.sender];
        const isSystem = reply.sender === 'system';

        return (
          <div
            key={reply.id}
            className={cn(
              'flex gap-3 p-3 rounded-lg border',
              colors.bg,
              colors.border,
              isSystem && 'opacity-70'
            )}
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className={cn('text-xs', colors.text)}>
                <Icon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('font-medium text-sm', colors.text)}>
                  {reply.senderName}
                </span>
                <Badge variant="outline" className={cn('text-[10px]', colors.badge)}>
                  {reply.sender === 'customer' ? 'Pelanggan' : reply.sender === 'agent' ? 'Agen' : 'Sistem'}
                </Badge>
                {getChannel(reply) === 'whatsapp' && (
                  <Badge variant="outline" className="text-[10px] bg-green-100 text-green-700 border-green-200">
                    <MessageCircle className="h-3 w-3 mr-0.5" /> WA
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(reply.timestamp), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
              <div className="text-sm whitespace-pre-wrap break-words">
                {reply.text}
              </div>
              {reply.attachments && reply.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {reply.attachments.map((att) => (
                    <a
                      key={att.key}
                      href={`/api/tickets/attachments/${att.key}`}
                      className="flex items-center gap-2 text-xs text-blue-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="h-3 w-3" />
                      {att.filename} ({(att.size / 1024).toFixed(1)} KB)
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
