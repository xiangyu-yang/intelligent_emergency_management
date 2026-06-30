import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  MessageCircle,
  BarChart3,
  Truck,
  FileText,
  Shield,
  AlertTriangle,
  Send,
  Loader2,
  X,
  Plus,
  Trash2,
  BookOpen,
  Activity,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { useChatSessions, ChatSession, ChatMessage } from '../hooks/useChatSessions';

interface ChatMessageDisplay {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
}

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  scenario: string;
}

const featureCards: FeatureCard[] = [
  {
    id: 'qna',
    title: '应急智能问答',
    description: '基于知识库的智能问答，快速获取应急知识和处置建议',
    icon: <MessageCircle size={24} />,
    color: 'from-blue-500 to-blue-600',
    scenario: 'qna',
  },
  {
    id: 'data_query',
    title: '应急智能问数',
    description: '智能数据分析助手，提供数据趋势分析和风险预警',
    icon: <BarChart3 size={24} />,
    color: 'from-green-500 to-green-600',
    scenario: 'data_query',
  },
  {
    id: 'dispatch',
    title: '应急智能调度',
    description: '智能资源调配建议，优化应急资源配置和调度方案',
    icon: <Truck size={24} />,
    color: 'from-orange-500 to-orange-600',
    scenario: 'dispatch',
  },
  {
    id: 'report',
    title: '智能报告生成',
    description: '自动生成规范的应急处置报告，提高工作效率',
    icon: <FileText size={24} />,
    color: 'from-purple-500 to-purple-600',
    scenario: 'report',
  },
  {
    id: 'risk_assessment',
    title: '风险评估',
    description: '基于历史数据和实时信息的综合风险评估',
    icon: <Shield size={24} />,
    color: 'from-red-500 to-red-600',
    scenario: 'general',
  },
  {
    id: 'emergency_guide',
    title: '应急指南',
    description: '提供各类突发事件的应急处置指南和操作流程',
    icon: <AlertTriangle size={24} />,
    color: 'from-cyan-500 to-cyan-600',
    scenario: 'qna',
  },
];

function AIAssistantPage() {
  const { sessions, loading: sessionsLoading, fetchSessions, fetchSessionDetail, deleteSession } = useChatSessions();
  
  const [selectedFeature, setSelectedFeature] = useState<FeatureCard | null>(null);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessageDisplay[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [enableDeepThinking, setEnableDeepThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkStatus();
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedFeature && !selectedSession) {
      setMessages([]);
      const welcomeMessages: Record<string, string> = {
        qna: '您好！我是应急智能问答助手。请问您想了解哪方面的应急知识？',
        data_query: '您好！我是应急数据分析助手。请提供您想分析的数据或问题。',
        dispatch: '您好！我是应急智能调度助手。请描述事件情况，我将为您提供资源调度建议。',
        report: '您好！我是智能报告生成助手。请提供事件信息，我将为您生成规范的报告。',
        general: '您好！我是智能应急助手。有什么可以帮您？',
      };
      setMessages([
        {
          role: 'assistant',
          content: welcomeMessages[selectedFeature.scenario] || welcomeMessages.general,
        },
      ]);
    }
  }, [selectedFeature]);

  const checkStatus = async () => {
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
  };

  const handleSelectSession = useCallback(async (session: ChatSession) => {
    setSelectedSession(session);
    const detail = await fetchSessionDetail(session.id);
    if (detail) {
      const displayMessages: ChatMessageDisplay[] = detail.messages.map((msg: ChatMessage) => ({
        role: msg.role,
        content: msg.content,
      }));
      setMessages(displayMessages);
      
      const feature = featureCards.find((f) => f.scenario === session.scenario);
      if (feature) {
        setSelectedFeature(feature);
      }
    }
  }, [fetchSessionDetail]);

  const handleCreateNewSession = useCallback(() => {
    setSelectedSession(null);
    setMessages([]);
    setSelectedFeature(null);
  }, []);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
      setMessages([]);
    }
    setShowDeleteConfirm(null);
  }, [deleteSession, selectedSession]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedFeature) return;

    const newMessages: ChatMessageDisplay[] = [
      ...messages,
      { role: 'user', content: input.trim() },
    ];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const apiPath: Record<string, string> = {
        qna: '/api/ai/assistant/qna',
        data_query: '/api/ai/assistant/data-query',
        dispatch: '/api/ai/assistant/dispatch',
        report: '/api/ai/assistant/report',
        general: '/api/ai/assistant/chat',
      };

      try {
        const scenario = selectedFeature.scenario;
        const userMessage = input.trim();
        const response = await fetch(apiPath[scenario], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          scenario: selectedFeature.scenario,
          stream: true,
          sessionId: selectedSession?.id,
          enableDeepThinking,
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
      let assistantReasoning = '';
      let buffer = '';
      let currentSessionId = selectedSession?.id;

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
              if (json.sessionId) {
                currentSessionId = json.sessionId;
              }
              if (json.error) {
                throw new Error(json.error);
              }
              if (json.content) {
                assistantContent += json.content;
              }
              if (json.reasoning) {
                assistantReasoning += json.reasoning;
              }
              if (json.content || json.reasoning) {
                setMessages((prev) => {
                  const lastIndex = prev.length - 1;
                  if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                    return [
                      ...prev.slice(0, lastIndex),
                      { role: 'assistant', content: assistantContent, reasoning: assistantReasoning },
                    ];
                  }
                  return [...prev, { role: 'assistant', content: assistantContent, reasoning: assistantReasoning }];
                });
              }
              if (json.finished) {
                if (!selectedSession && currentSessionId) {
                  await fetchSessions();
                }
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

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {status !== 'online' && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-amber-800">大模型未就绪</p>
            <p className="text-sm text-amber-600">
              {status === 'connecting'
                ? '正在连接...'
                : '请检查Ollama服务是否启动，模型是否已加载'}
            </p>
          </div>
          <button
            onClick={checkStatus}
            className="ml-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            重新检测
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <Bot size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">智能应急助手</h1>
            <p className="text-gray-500 text-sm">AI赋能的智能应急管理平台</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'online'
                ? 'bg-green-500'
                : status === 'offline'
                ? 'bg-red-500'
                : 'bg-yellow-500 animate-pulse'
            }`}
          />
          <span className="text-sm text-gray-600">
            {status === 'online'
              ? '大模型在线'
              : status === 'offline'
              ? '大模型离线'
              : '连接中...'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <div className="w-72 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare size={18} />
              会话历史
            </h3>
            <button
              onClick={handleCreateNewSession}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="新建会话"
            >
              <Plus size={18} className="text-primary-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无会话</p>
                <p className="text-xs">点击右下角新建会话开始对话</p>
              </div>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`relative p-3 rounded-xl cursor-pointer transition-all ${
                      selectedSession?.id === session.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(session.id);
                      }}
                      className="absolute top-2 right-2 p-1 hover:bg-red-50 rounded opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>

                    {showDeleteConfirm === session.id && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-lg z-10">
                        <span className="mr-1">确定删除?</span>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="text-white underline"
                        >
                          是
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="text-white ml-2 underline"
                        >
                          否
                        </button>
                      </div>
                    )}

                    <div
                      onClick={() => handleSelectSession(session)}
                      className="flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white flex-shrink-0">
                        <Bot size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {session.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            {session.messageCount} 条消息
                          </span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {formatTime(session.lastMessageAt)}
                          </span>
                        </div>
                      </div>
                      {selectedSession?.id === session.id && (
                        <ChevronRight size={16} className="text-primary-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100">
            <button
              onClick={handleCreateNewSession}
              className="w-full py-3 border-2 border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50 rounded-xl text-gray-500 hover:text-primary-600 font-medium transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              新建会话
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedFeature ? (
            <div className="flex-1 overflow-auto bg-gray-50 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featureCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedFeature(card)}
                    className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all duration-300 text-left"
                  >
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
                    >
                      {card.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {card.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {card.description}
                    </p>
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg
                        className="w-5 h-5 text-primary-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-white">
                <div className="flex items-start gap-6">
                  <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Bot size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">智能助手能力说明</h3>
                    <ul className="space-y-2 text-white/80">
                      <li className="flex items-center gap-2">
                        <BookOpen size={16} />
                        <span>基于本地大模型，支持私有化部署</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Activity size={16} />
                        <span>实时流式响应，对话体验流畅</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Shield size={16} />
                        <span>数据安全，无需上传至云端</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-gray-50 rounded-2xl overflow-hidden">
              <div className="bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedFeature.color} flex items-center justify-center text-white`}
                  >
                    {selectedFeature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedFeature.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedFeature.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSession && (
                    <span className="text-xs px-2 py-1 bg-primary-50 text-primary-600 rounded-full">
                      {selectedSession.title}
                    </span>
                  )}
                  <button
                    onClick={handleCreateNewSession}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="返回选择"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <span className="text-sm font-semibold">我</span>
                      ) : (
                        <Bot size={18} />
                      )}
                    </div>
                    <div
                    className={`max-w-[75%] px-5 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-primary-500 text-white rounded-tr-sm'
                        : 'bg-white text-gray-700 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.reasoning && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity size={14} className="text-amber-500" />
                          <span className="text-xs font-medium text-amber-600">思考过程</span>
                        </div>
                        <p className="text-xs text-gray-500 whitespace-pre-wrap bg-amber-50 p-2 rounded-lg">
                          {message.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex-shrink-0 flex items-center justify-center">
                      <Bot size={18} />
                    </div>
                    <div className="bg-white px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                        <span className="text-sm text-gray-400">思考中...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setEnableDeepThinking(!enableDeepThinking)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      enableDeepThinking
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <Activity size={14} />
                    深度思考
                  </button>
                  {enableDeepThinking && (
                    <span className="text-xs text-amber-500">开启后将展示模型思考过程</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="输入您的问题..."
                    disabled={status !== 'online' || isLoading}
                    className="flex-1 px-5 py-3 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || status !== 'online' || isLoading}
                    className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIAssistantPage;