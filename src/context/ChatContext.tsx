'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Message } from '../core/domain/Message';
import { Channel } from '../core/domain/Channel';
import { CopilotQueryResult } from '../core/domain/CopilotContext';

interface ChatContextType {
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  channels: Channel[];
  messages: Message[];
  isLoading: boolean;
  hasMore: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: Message[];
  sendMessage: (content: string) => Promise<void>;
  loadEarlierMessages: () => Promise<void>;
  searchMessages: (query: string) => Promise<void>;
  clearSearch: () => void;
  copilotQuery: (query: string) => Promise<CopilotQueryResult>;
  fetchChannels: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [activeChannelId, setActiveChannelId] = useState<string | null>('channel_01');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);

  const fetchChannels = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
    }
  }, [token]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchChannels();
    });
  }, [fetchChannels]);

  // Load initial messages on channel change
  useEffect(() => {
    if (!activeChannelId || !token) return;
    
    // Clear and reset state asynchronously to avoid synchronous cascading renders warning
    Promise.resolve().then(() => {
      setMessages([]);
      setHasMore(true);
    });

    const fetchInitial = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/messages?channelId=${activeChannelId}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        if (data && Array.isArray(data.items)) {
          setMessages(data.items);
          if (data.items.length < 20) setHasMore(false);
        } else {
          setMessages([]);
        }
      } catch (err) {
        console.error('Error loading initial messages:', err);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitial();
  }, [activeChannelId, token]);

  const loadEarlierMessages = async () => {
    if (!activeChannelId || !token || !hasMore || isLoading || messages.length === 0) return;
    const oldestMessage = messages[0];
    const oldestTimestamp = oldestMessage.rw_created_at;
    const oldestId = oldestMessage.rw_id;

    if (!oldestTimestamp || !oldestId) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/messages?channelId=${activeChannelId}&cursorDate=${encodeURIComponent(
          typeof oldestTimestamp === 'string' ? oldestTimestamp : oldestTimestamp.toISOString()
        )}&cursorId=${oldestId}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        if (data.items.length < 20) setHasMore(false);
        setMessages((prev) => [...data.items, ...prev]);
      }
    } catch (err) {
      console.error('Error loading earlier messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!activeChannelId || !token) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      rw_id: tempId,
      rw_channel_id: activeChannelId,
      rw_user_id: 'me',
      rw_content: content,
      rw_is_edited: false,
      rw_is_deleted: false,
      rw_created_at: new Date().toISOString(),
      userFullName: 'Yo',
      status: 'pending'
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channelId: activeChannelId, content })
      });

      if (!res.ok) throw new Error();
      const savedMessage = await res.json();

      setMessages((prev) =>
        prev.map((msg) => (msg.rw_id === tempId ? { ...savedMessage, status: 'sent' } : msg))
      );
    } catch {
      setMessages((prev) =>
        prev.map((msg) => (msg.rw_id === tempId ? { ...msg, status: 'failed' } : msg))
      );
    }
  };

  const searchMessages = async (query: string) => {
    if (!token) return;
    if (!query.trim()) {
      clearSearch();
      return;
    }
    setSearchQuery(query);
    try {
      const res = await fetch(`/api/messages/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const copilotQuery = async (query: string): Promise<CopilotQueryResult> => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch('/api/copilot/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ query })
    });
    return await res.json();
  };

  return (
    <ChatContext.Provider
      value={{
        activeChannelId,
        setActiveChannelId,
        channels,
        messages,
        isLoading,
        hasMore,
        searchQuery,
        setSearchQuery: searchMessages,
        searchResults,
        sendMessage,
        loadEarlierMessages,
        searchMessages,
        clearSearch,
        copilotQuery,
        fetchChannels
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};