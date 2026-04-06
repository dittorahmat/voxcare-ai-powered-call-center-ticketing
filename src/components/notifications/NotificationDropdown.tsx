import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Clock, AlertTriangle, PhoneCall, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  children: React.ReactNode;
  unreadCount: number;
  onCountChange: (count: number) => void;
}

interface NotificationItem {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  data: Record<string, unknown>;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  'ticket-created': <Bell className="size-4 text-blue-500" />,
  'sla-warning': <Clock className="size-4 text-amber-500" />,
  'sla-breached': <AlertTriangle className="size-4 text-red-500" />,
  'call-assigned': <PhoneCall className="size-4 text-indigo-500" />,
  'escalation': <AlertTriangle className="size-4 text-red-600" />,
  'agent-status': <Bell className="size-4 text-slate-500" />,
};

export function NotificationDropdown({ children, unreadCount, onCountChange }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchNotifications = async (p: number = 1, append = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const res = await fetch(`/api/notifications?page=${p}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        if (append) {
          setNotifications(prev => [...prev, ...data]);
        } else {
          setNotifications(data);
        }
        setHasMore(json.pagination ? p < json.pagination.totalPages : data.length < 10);
        setPage(p);
      }
    } catch { /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      if (unreadCount > 0) onCountChange(unreadCount - 1);
    } catch {
      // Ignore
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await fetch(`/api/notifications/${n.id}/read`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      onCountChange(0);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative" ref={ref}>
      <div onClick={handleOpen}>{children}</div>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600" onClick={markAllRead}>
                <Check className="size-3 mr-1" /> Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="h-72">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-indigo-50/30' : ''}`}
                  onClick={() => markRead(n.id)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0">
                      {NOTIFICATION_ICONS[n.type] || <Bell className="size-4 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">
                        {n.type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && <div className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />}
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
          {hasMore && notifications.length >= 10 && (
            <div className="border-t border-slate-100 p-2 text-center">
              <Button variant="ghost" size="sm" className="text-xs text-indigo-600 w-full" onClick={() => fetchNotifications(page + 1, true)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
