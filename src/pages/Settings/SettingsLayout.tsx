import React from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, User, Shield, Brain, Bell, Users, MessageSquare, Clock, Mail, CalendarClock, BookOpen, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { value: 'profile', label: 'Profile', icon: User, path: '/settings/profile', roles: ['agent', 'supervisor', 'admin'] as const },
  { value: 'system', label: 'System', icon: Shield, path: '/settings/system', roles: ['admin'] as const },
  { value: 'sla', label: 'SLA Rules', icon: Users, path: '/settings/sla', roles: ['admin'] as const },
  { value: 'autoclose', label: 'Auto-Close', icon: Clock, path: '/settings/autoclose', roles: ['admin'] as const },
  { value: 'canned', label: 'Templates', icon: MessageSquare, path: '/settings/canned', roles: ['admin'] as const },
  { value: 'ai', label: 'AI Config', icon: Brain, path: '/settings/ai', roles: ['admin'] as const },
  { value: 'notifications', label: 'Notifications', icon: Bell, path: '/settings/notifications', roles: ['agent', 'supervisor', 'admin'] as const },
  { value: 'email-templates', label: 'Email Templates', icon: Mail, path: '/settings/email-templates', roles: ['admin'] as const },
  { value: 'scheduled-reports', label: 'Scheduled Reports', icon: CalendarClock, path: '/settings/scheduled-reports', roles: ['admin'] as const },
  { value: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen, path: '/settings/knowledge-base', roles: ['admin'] as const },
  { value: 'whatsapp', label: 'WhatsApp', icon: Phone, path: '/settings/whatsapp', roles: ['admin'] as const },
];

export function SettingsLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleTabs = tabs.filter(t => t.roles.includes(user?.role || 'agent'));

  const currentValue = visibleTabs.find(t => location.pathname.startsWith(t.path))?.value || 'profile';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <SettingsIcon className="size-7 text-indigo-600" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your profile and system configuration.</p>
      </div>
      <Tabs value={currentValue} onValueChange={(v) => {
        const tab = visibleTabs.find(t => t.value === v);
        if (tab) navigate(tab.path);
      }}>
        <TabsList className="grid grid-cols-9 w-full">
          {visibleTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs">
              <tab.icon className="size-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Outlet />
    </div>
  );
}
