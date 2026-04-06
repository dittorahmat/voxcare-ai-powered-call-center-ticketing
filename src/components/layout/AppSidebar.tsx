import React from "react";
import { LayoutDashboard, Mic2, Inbox, Settings, PhoneCall, LogOut, User, Users, Calendar, FileText, BarChart3, Shield, Circle, Monitor, CalendarDays } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPatch, apiPost } from "@/lib/apiClient";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";

const ROLE_LABELS = { agent: 'Agent', supervisor: 'Supervisor', admin: 'Admin' };

export function AppSidebar(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isSupervisor = user?.role === 'supervisor' || user?.role === 'admin';
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [breakReason, setBreakReason] = useState('other');

  const navItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Live Call", icon: Mic2, path: "/live-call" },
    { title: "Tickets", icon: Inbox, path: "/tickets" },
    { title: "Customers", icon: Users, path: "/customers" },
    { title: "Calls", icon: Calendar, path: "/calls" },
    { title: "Settings", icon: Settings, path: "/settings/profile" },
  ];

  const supervisorItems = [
    { title: "Analytics", icon: BarChart3, path: "/analytics" },
    { title: "Wallboard", icon: Monitor, path: "/wallboard" },
    { title: "Shifts", icon: CalendarDays, path: "/admin/shifts" },
    { title: "Audit Log", icon: FileText, path: "/audit" },
    { title: "Agent Queue", icon: Users, path: "/admin/queue" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleStatusChange = async (status: string) => {
    if (status === 'break') {
      setBreakDialogOpen(true);
      return;
    }
    // Auto-end break when changing to available/busy
    if (status === 'available' || status === 'busy') {
      try { await apiPost('/api/breaks/end'); } catch { /* no active break */ }
    }
    try {
      await apiPatch('/api/agents/me/status', { availability: status });
    } catch { /* ignore */ }
  };

  const handleBreakConfirm = async () => {
    try {
      await apiPost('/api/breaks/start', { reason: breakReason });
      await apiPatch('/api/agents/me/status', { availability: 'break' });
    } catch { /* ignore */ }
    setBreakDialogOpen(false);
    setBreakReason('other');
  };

  const statusColors: Record<string, string> = {
    available: 'text-emerald-600',
    busy: 'text-amber-600',
    break: 'text-blue-600',
    lunch: 'text-orange-600',
    offline: 'text-slate-400',
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-indigo-200 shadow-lg">
            <PhoneCall className="size-5" />
          </div>
          <span className="font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden">VoxCare</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-6 mb-2 group-data-[collapsible=icon]:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Main Menu
          </SidebarGroupLabel>
          <SidebarMenu className="px-3 gap-1">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.title}
                  className={cn(
                    "h-11 px-3 rounded-md transition-all duration-200",
                    location.pathname === item.path
                      ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Link to={item.path}>
                    <item.icon className={cn("size-5", location.pathname === item.path && "text-indigo-600")} />
                    <span className="text-[15px]">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        {/* Supervisor+ section */}
        {isSupervisor && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-6 mb-2 group-data-[collapsible=icon]:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Supervision
            </SidebarGroupLabel>
            <SidebarMenu className="px-3 gap-1">
              {supervisorItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.path}
                    tooltip={item.title}
                    className={cn(
                      "h-11 px-3 rounded-md transition-all duration-200",
                      location.pathname === item.path
                        ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <Link to={item.path}>
                      <item.icon className={cn("size-5", location.pathname === item.path && "text-indigo-600")} />
                      <span className="text-[15px]">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
        {/* Administration section (admin only) */}
        {user?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-6 mb-2 group-data-[collapsible=icon]:hidden text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Administration
            </SidebarGroupLabel>
            <SidebarMenu className="px-3 gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname.startsWith('/admin')}
                  tooltip="User Management"
                  className={cn(
                    "h-11 px-3 rounded-md transition-all duration-200",
                    location.pathname.startsWith('/admin')
                      ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Link to="/admin/users">
                    <Shield className="size-5" />
                    <span className="text-[15px]">User Management</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/40">
        <div className="flex flex-col gap-3 group-data-[collapsible=icon]:hidden">
          {/* Authenticated user */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 flex-shrink-0">
                <User className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          {/* Agent status selector */}
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
            <Circle className={`size-3 ${statusColors[(user as any)?.availability || 'available']}`} fill="currentColor" />
            <Select defaultValue={(user as any)?.availability || 'available'} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 text-xs border-none bg-transparent p-0 font-medium hover:underline">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="break">On Break</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Logout button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50 px-3 h-9"
          >
            <LogOut className="size-4 mr-2" />
            <span>Sign Out</span>
          </Button>
        </div>
        {/* Break reason dialog */}
        <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Break Reason</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Label>Select reason for break</Label>
              <div className="grid grid-cols-2 gap-2">
                {['lunch', 'personal', 'training', 'other'].map(r => (
                  <Button key={r} type="button" variant={breakReason === r ? 'default' : 'outline'} size="sm" onClick={() => setBreakReason(r)}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Button>
                ))}
              </div>
              <Input value={breakReason === 'other' ? breakReason : breakReason} onChange={e => setBreakReason(e.target.value)} placeholder="Custom reason..." />
              <Button onClick={handleBreakConfirm} className="w-full">Start Break</Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Collapsed state */}
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="size-8 text-muted-foreground hover:text-red-600" title="Sign Out">
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}