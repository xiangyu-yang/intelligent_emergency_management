import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { useChatSessions, ChatSession } from '../hooks/useChatSessions';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function FloatingAssistant() {
  const { sessions, fetchSessions, fetchSessionDetail } = useChatSessions();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/assistant/status');
      const data = await response.json();
      if (data.code === 0 && data.data?.online && data.data?.modelLoaded) {
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch {
      setStatus('offline');
    }
  }, []);

  const loadLastSession = useCallback(async () => {
    await fetchSessions();
    if (sessions.length > 0) {
      const lastSession = sessions[0];
      const detail = await fetchSessionDetail(lastSession.id);
      if (detail) {
        setCurrentSession(lastSession);
        setMessages(detail.messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })));
      }
    }
  }, [fetchSessions, fetchSessionDetail, sessions]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (isOpen) {
      intervalRef.current = window.setInterval(checkStatus, 30000);
      loadLastSession();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, checkStatus, loadLastSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: input.trim() },
    ];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const userMessage = input.trim();
      const response = await fetch('/api/ai/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          scenario: 'general',
          stream: true,
          sessionId: currentSession?.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const json = JSON.parse(data);
              if (json.sessionId && !currentSession) {
                await fetchSessions();
              }
              if (json.error) {
                throw new Error(json.error);
              }
              if (json.content) {
                assistantContent += json.content;
                setMessages((prev) => {
                  const lastIndex = prev.length - 1;
                  if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                    return [
                      ...prev.slice(0, lastIndex),
                      { role: 'assistant', content: assistantContent },
                    ];
                  }
                  return [...prev, { role: 'assistant', content: assistantContent }];
                });
              }
              if (json.finished) {
                break;
              }
            } catch (e) {
              if (e instanceof Error && e.message) throw e;
              continue;
            }
          }
        }
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `错误: ${error.message || '无法连接到智能助手'}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setCurrentSession(null);
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          checkStatus();
        }}
        className="fixed right-6 bottom-6 w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center z-50"
      >
        <Bot size={24} />
        <span
          className={`absolute top-0 right-0 w-3 h-3 rounded-full ${
            status === 'online'
              ? 'bg-green-400'
              : status === 'offline'
              ? 'bg-red-400'
              : 'bg-yellow-400'
          }`}
        />
      </button>

      {isOpen && (
        <div className="fixed right-6 bottom-24 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">智能应急助手</h3>
                <p className="text-white/70 text-xs">
                  {status === 'online'
                    ? '在线'
                    : status === 'offline'
                    ? '离线'
                    : '连接中...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-white/70 hover:text-white transition-colors p-1"
                  title="清空对话"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Bot size={48} className="mb-3 opacity-50" />
                <p className="text-sm">
                  {status === 'online'
                    ? '您好！我是智能应急助手，有什么可以帮您？'
                    : '智能助手暂不可用，请稍后再试'}
                </p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <span className="text-sm font-semibold">我</span>
                    ) : (
                      <Bot size={16} />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white rounded-tr-sm'
                        : 'bg-white text-gray-700 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex-shrink-0 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl rounded-tl-sm shadow-sm">
                  <div className="flex items-center gap-1">
                    <Loader2 size={14} className="animate-spin text-gray-400" />
                    <span className="text-sm text-gray-400">思考中...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您的问题..."
                disabled={status !== 'online' || isLoading}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-100 disabled:text-gray-400"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || status !== 'online' || isLoading}
                className="w-10 h-10 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FloatingAssistant;