'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useChatStream } from '@/hooks/use-chat-stream';
import { insforge, getAccessToken } from '@/lib/insforge';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { ChatInputBar } from '@/components/chat/chat-input-bar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatConversation, ChatMessage } from '@/types';

export default function ChatPage() {
  const { user } = useAuth();
  const {
    streamingText,
    isStreaming,
    error: streamError,
    conversationId: streamConversationId,
    startStream,
    cancel,
  } = useChatStream();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    loadConversations();
  }, [user]);

  // Update active conversation ID when a new conversation is created via streaming
  useEffect(() => {
    if (streamConversationId && !activeConversationId) {
      setActiveConversationId(streamConversationId);
      // Refresh conversation list to show the new conversation
      loadConversations();
    }
  }, [streamConversationId, activeConversationId]);

  // Show stream errors
  useEffect(() => {
    if (streamError) {
      toast.error('Failed to get response: ' + streamError);
    }
  }, [streamError]);

  // When streaming finishes, reload messages to get the persisted assistant message
  useEffect(() => {
    if (!isStreaming && streamingText && activeConversationId) {
      loadMessages(activeConversationId);
      loadConversations();
    }
  }, [isStreaming]);

  async function loadConversations() {
    try {
      const { data } = await insforge.database
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .is('context_content_id', null)
        .order('updated_at', { ascending: false });
      setConversations((data || []) as ChatConversation[]);
    } catch {
      // Silently fail
    } finally {
      setIsLoadingConversations(false);
    }
  }

  async function loadMessages(conversationId: string) {
    setIsLoadingMessages(true);
    try {
      const { data } = await insforge.database
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setMessages((data || []) as ChatMessage[]);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  }

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (isStreaming) return;
      setActiveConversationId(id);
      loadMessages(id);
      setSidebarOpen(false);
    },
    [isStreaming]
  );

  const handleNewChat = useCallback(() => {
    if (isStreaming) return;
    setActiveConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
  }, [isStreaming]);

  const handleSend = useCallback(
    async (message: string) => {
      // Optimistically add the user message to the UI
      const optimisticMessage: ChatMessage = {
        id: 'temp-' + Date.now(),
        conversation_id: activeConversationId || '',
        role: 'user',
        content: message,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      // Start streaming
      await startStream(activeConversationId, message);
    },
    [activeConversationId, startStream]
  );

  const handleGenerateContent = useCallback(async () => {
    const convId = activeConversationId || streamConversationId;
    if (!convId) return;

    setIsGenerating(true);
    try {
      const token = getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/chat/generate-content', {
        method: 'POST',
        headers,
        body: JSON.stringify({ conversationId: convId }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Generation failed');
      }

      const result = await response.json();
      toast.success(`Created "${result.title}" with ${result.sectionCount} sections`);

      // Reload messages to show the content generation card
      await loadMessages(convId);
      await loadConversations();
    } catch (err) {
      toast.error('Failed to generate content: ' + (err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  }, [activeConversationId, streamConversationId]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      try {
        await insforge.database
          .from('chat_conversations')
          .update({ status: 'archived' })
          .eq('id', id)
          .eq('user_id', user!.id);

        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
        }
        await loadConversations();
      } catch {
        toast.error('Failed to delete conversation');
      }
    },
    [activeConversationId, user]
  );

  // Determine if Generate Content button should show (2+ user messages in conversation)
  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const hasGeneratedContent = conversations.find(
    (c) => c.id === activeConversationId
  )?.generated_content_id;
  const showGenerateButton = userMessageCount >= 2 && !hasGeneratedContent;

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] md:-m-6">
      {/* Desktop sidebar */}
      <div className="hidden w-64 shrink-0 border-r bg-card md:block">
        <ChatSidebar
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          onDelete={handleDeleteConversation}
        />
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header with sidebar toggle */}
        <div className="flex items-center gap-2 border-b p-2 md:hidden">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <ChatSidebar
                conversations={conversations}
                activeId={activeConversationId}
                onSelect={handleSelectConversation}
                onNewChat={handleNewChat}
                onDelete={handleDeleteConversation}
              />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium">
            {activeConversationId
              ? conversations.find((c) => c.id === activeConversationId)?.title ||
                'New conversation'
              : 'New Chat'}
          </span>
        </div>

        {/* Messages */}
        <ChatMessageList
          messages={messages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          onSuggestionClick={handleSend}
        />

        {/* Input */}
        <ChatInputBar
          onSend={handleSend}
          onGenerateContent={handleGenerateContent}
          isStreaming={isStreaming}
          onCancel={cancel}
          showGenerateButton={showGenerateButton}
          isGenerating={isGenerating}
        />
      </div>
    </div>
  );
}
