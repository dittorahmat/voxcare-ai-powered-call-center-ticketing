import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Search, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { CommandPalette } from "@/components/CommandPalette";
import { useHotkeys } from "react-hotkeys-hook";
import { useNotificationStream } from "@/hooks/useNotificationStream";
import { useTicketStore } from "@/store/ticketStore";

export function MainLayout(): JSX.Element {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize ticket store on mount - only if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      useTicketStore.getState().initialize().catch(console.error);
    }
  }, [isAuthenticated]);

  // SSE real-time notifications
  const { isConnected } = useNotificationStream({
    onEvent: (event) => {
      // Increment unread count
      setUnreadCount(prev => prev + 1);

      // Sound alert
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }

      // Desktop notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("VoxCare Notification", {
          body: `${event.type.replace(/-/g, " ")}`,
          icon: "/vite.svg",
        });
      }
    },
  });

  // Cmd+K / Ctrl+K shortcut
  useHotkeys("mod+k", (e) => {
    e.preventDefault();
    setCmdOpen((prev) => !prev);
  });

  // Enter on header search → open command palette
  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.length >= 2) {
      setCmdOpen(true);
    }
  };

  // Fetch unread count on mount and periodically
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        const res = await fetch('/api/notifications/unread-count', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setUnreadCount(json.data?.count || 0);
        }
      } catch {
        // Ignore fetch errors
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Generate initials from user name
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const avatarUrl = (user as any)?.avatarDataUrl;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <header className="h-16 border-b border-border/40 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <SidebarTrigger className="-ml-1 text-slate-500 hover:text-slate-900" />
              <div className="relative max-w-md w-full hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search... (⌘K)"
                  className="pl-9 bg-slate-100/50 border-transparent focus:bg-white focus:ring-1 focus:ring-indigo-500/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <ThemeToggle className="static" />
              {/* Notification Bell */}
              <NotificationDropdown unreadCount={unreadCount} onCountChange={setUnreadCount}>
                <Button variant="ghost" size="icon" className="relative text-slate-500">
                  <Bell className="size-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </NotificationDropdown>
              <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block" />
              {/* User Avatar Button */}
              <Button variant="ghost" className="gap-2 px-2 hover:bg-slate-100">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user?.name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                    {getInitials(user?.name)}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold leading-none">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{user?.role || 'Agent'}</p>
                </div>
              </Button>
            </div>
          </header>
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-12">
              <Outlet />
            </div>
            {/* AI Warning Footer Note */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
                <p className="font-medium">Note on AI Usage</p>
                <p className="mt-1 opacity-90">
                  This project features AI capabilities. Please note that there is a limit on the number of requests that can be made to the AI servers across all user apps in a given time period.
                </p>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      {/* Hidden audio element for notification sounds */}
      <audio ref={audioRef} preload="auto" src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" />
    </SidebarProvider>
  );
}