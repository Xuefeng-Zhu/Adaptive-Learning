'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import type { ChatConversation } from '@/types';

interface ChatSidebarProps {
  conversations: ChatConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

function groupByDate(conversations: ChatConversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: ChatConversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 Days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const conv of conversations) {
    const date = new Date(conv.updated_at);
    if (date >= today) {
      groups[0].items.push(conv);
    } else if (date >= yesterday) {
      groups[1].items.push(conv);
    } else if (date >= weekAgo) {
      groups[2].items.push(conv);
    } else {
      groups[3].items.push(conv);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: ChatSidebarProps) {
  const groups = groupByDate(conversations);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <Button onClick={onNewChat} className="w-full" variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" /> New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {groups.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No conversations yet
          </p>
        )}
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  activeId === conv.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 truncate">
                  {conv.title || 'New conversation'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
