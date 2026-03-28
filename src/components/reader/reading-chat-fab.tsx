'use client';

import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadingChatFabProps {
  open: boolean;
  onToggle: () => void;
}

export function ReadingChatFab({ open, onToggle }: ReadingChatFabProps) {
  return (
    <Button
      onClick={onToggle}
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-20 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105',
        open && 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
      variant={open ? 'outline' : 'default'}
    >
      {open ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </Button>
  );
}
