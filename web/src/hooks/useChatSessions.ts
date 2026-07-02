import { useState, useCallback } from 'react';

export interface ChatSession {
  id: string;
  title: string;
  scenario: string;
  status: string;
  lastMessageAt?: string;
  messageCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  createdAt: string;
}

export interface ChatSessionWithMessages extends ChatSession {
  messages: ChatMessage[];
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/assistant/sessions');
      const data = await response.json();
      if (data.code === 0) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessionDetail = useCallback(async (sessionId: string): Promise<ChatSessionWithMessages | null> => {
    try {
      const response = await fetch(`/api/ai/assistant/sessions/${sessionId}`);
      const data = await response.json();
      if (data.code === 0) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch session detail:', error);
      return null;
    }
  }, []);

  const createSession = useCallback(async (title: string, scenario?: string): Promise<ChatSession | null> => {
    try {
      const response = await fetch('/api/ai/assistant/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, scenario: scenario || 'general' }),
      });
      const data = await response.json();
      if (data.code === 0) {
        await fetchSessions();
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }, [fetchSessions]);

  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/ai/assistant/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.code === 0) {
        await fetchSessions();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    fetchSessions,
    fetchSessionDetail,
    createSession,
    deleteSession,
  };
}