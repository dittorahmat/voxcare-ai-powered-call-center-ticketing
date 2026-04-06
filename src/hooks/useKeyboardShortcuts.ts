import { useEffect, useRef, useCallback } from 'react';

interface ShortcutConfig {
  // Ticket list shortcuts
  onNavigateDown?: () => void;     // j
  onNavigateUp?: () => void;       // k
  onOpenTicket?: () => void;       // Enter
  onEditTicket?: () => void;       // e
  onAssignTicket?: () => void;     // a
  onSelectTicket?: () => void;     // x

  // Ticket detail shortcuts
  onReply?: () => void;            // r
  onInternalNote?: () => void;     // i
  onSaveNote?: () => void;         // Ctrl+Enter
  onCloseModal?: () => void;       // Escape

  // Global
  onCommandPalette?: () => void;   // Cmd+K / Ctrl+K
  onShowHelp?: () => void;         // ?
}

export function useKeyboardShortcuts(config: ShortcutConfig, enabled: boolean = true) {
  const configRef = useRef(config);
  configRef.current = config;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // Always allow these even in inputs
    if (isInput && !e.metaKey && !e.ctrlKey) return;
    if (isInput && e.key !== 'k' && e.key !== 'Enter') return;

    const cmd = e.metaKey || e.ctrlKey;

    // Global shortcuts
    if (cmd && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      configRef.current.onCommandPalette?.();
      return;
    }
    if (e.key === '?' && !isInput) {
      e.preventDefault();
      configRef.current.onShowHelp?.();
      return;
    }

    if (isInput) return;

    // Ticket list shortcuts
    if (e.key === 'j') { e.preventDefault(); configRef.current.onNavigateDown?.(); }
    if (e.key === 'k') { e.preventDefault(); configRef.current.onNavigateUp?.(); }
    if (e.key === 'Enter' && !cmd) { e.preventDefault(); configRef.current.onOpenTicket?.(); }
    if (e.key === 'e') { e.preventDefault(); configRef.current.onEditTicket?.(); }
    if (e.key === 'a') { e.preventDefault(); configRef.current.onAssignTicket?.(); }
    if (e.key === 'x') { e.preventDefault(); configRef.current.onSelectTicket?.(); }

    // Ticket detail shortcuts
    if (e.key === 'r') { e.preventDefault(); configRef.current.onReply?.(); }
    if (e.key === 'i') { e.preventDefault(); configRef.current.onInternalNote?.(); }
    if (e.key === 'Enter' && cmd) { e.preventDefault(); configRef.current.onSaveNote?.(); }
    if (e.key === 'Escape') { e.preventDefault(); configRef.current.onCloseModal?.(); }
  }, [enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
