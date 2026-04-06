import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '@/lib/apiClient';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Ticket, User, PhoneCall, Settings, LayoutDashboard, BarChart3, Inbox } from 'lucide-react';

interface SearchResult {
  type: 'ticket' | 'customer' | 'call';
  id: string;
  title: string;
  subtitle: string;
  relevanceScore: number;
  url: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, url: '/' },
  { label: 'Tickets', icon: Inbox, url: '/tickets' },
  { label: 'Customers', icon: User, url: '/customers' },
  { label: 'Calls', icon: PhoneCall, url: '/calls' },
  { label: 'Analytics', icon: BarChart3, url: '/analytics' },
  { label: 'Settings', icon: Settings, url: '/settings/profile' },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ticket: <Ticket className="size-4 text-indigo-500" />,
  customer: <User className="size-4 text-emerald-500" />,
  call: <PhoneCall className="size-4 text-amber-500" />,
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await apiGet<{ success: boolean; data: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
      setResults(res.data || []);
    } catch {
      setResults([]);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  const handleSelect = (url: string) => {
    onOpenChange(false);
    navigate(url);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search tickets, customers, calls..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation shortcuts */}
        <CommandGroup heading="Navigation">
          {NAV_ITEMS.map(item => (
            <CommandItem key={item.url} value={item.label.toLowerCase()} onSelect={() => handleSelect(item.url)}>
              <item.icon className="size-4 mr-2 text-muted-foreground" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {/* Search results */}
        {results.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Results">
              {results.map(r => (
                <CommandItem key={`${r.type}-${r.id}`} value={`${r.type} ${r.id} ${r.title}`} onSelect={() => handleSelect(r.url)}>
                  {TYPE_ICONS[r.type]}
                  <div className="ml-2 flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
