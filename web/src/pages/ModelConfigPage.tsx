import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Server,
  Bot,
  Zap,
  FileText,
} from 'lucide-react';

interface LLMConfig {
  apiBaseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  enableDeepThinking?: boolean;
}

interface TestResult {
  online: boolean;
  model?: string;
  error?: string;
  availableModels?: string[];
  modelDownloaded?: boolean;
  modelLoaded?: boolean;
  status?: string;
  message?: string;
}

function ModelConfigPage() {
  const [config, setConfig] = useState<LLMConfig>({
    apiBaseUrl: 'http://localhost:11434/v1',
    model: 'qwen3.6:35b-a3b-q8_0',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 4096,
    enableDeepThinking: false,
  });
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('offline');
  const [isStarting, setIsStarting] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/ai/assistant/config');
      const data = await response.json();
      if (data.code === 0 && data.data) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/ai/assistant/status');
      const data = await response.json();
      if (data.code === 0 && data.data) {
        if (data.data.online && data.data.modelLoaded) {
          setStatus('online');
        } else {
          setStatus('offline');
        }
        if (data.data.availableModels && data.data.availableModels.length > 0) {
          setAvailableModels(data.data.availableModels);
        }
      }
    } catch {
      setStatus('offline');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/ai/assistant/test-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (data.code === 0) {
        setTestResult(data.data);
        if (data.data.availableModels && data.data.availableModels.length > 0) {
          setAvailableModels(data.data.availableModels);
        }
        if (data.data.online && data.data.modelLoaded) {
          setStatus('online');
        } else {
          setStatus('offline');
        }
      } else {
        setTestResult({ online: false, error: data.message });
        setStatus('offline');
      }
    } catch (error: any) {
      setTestResult({ online: false, error: error.message });
      setStatus('offline');
    } finally {
      setIsTesting(false);
    }
  };

  const handleStartModel = async () => {
    setIsStarting(true);
    try {
      const response = await fetch('/api/ai/assistant/start-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: config.model, apiBaseUrl: config.apiBaseUrl }),
      });
      const data = await response.json();
      if (data.code === 0) {
        setSaveMessage('模型启动成功');
        setTimeout(() => setSaveMessage(''), 3000);
        handleTest();
      } else {
        setSaveMessage(data.message || '模型启动失败');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error: any) {
      setSaveMessage(error.message || '模型启动失败');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch('/api/ai/assistant/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (data.code === 0) {
        setSaveMessage('✅ 配置保存成功，已立即生效');
        await checkStatus();
        setTimeout(() => setSaveMessage(''), 5000);
      } else {
        setSaveMessage('❌ ' + (data.message || '保存失败'));
        setTimeout(() => setSaveMessage(''), 5000);
      }
    } catch (error: any) {
      setSaveMessage('❌ ' + (error.message || '保存失败'));
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const response = await fetch('/api/ai/assistant/default-config');
      const data = await response.json();
      if (data.code === 0) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Failed to reset config:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <Settings size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">应急模型配置</h1>
            <p className="text-gray-500 text-sm">管理本地大模型连接配置</p>
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

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Server size={20} className="text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900">连接配置</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API基础地址
                  </label>
                  <input
                    type="url"
                    value={config.apiBaseUrl}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, apiBaseUrl: e.target.value }))
                    }
                    placeholder="http://localhost:11434/v1"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ollama服务地址，通常为 http://localhost:11434/v1
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    模型名称
                  </label>
                  <select
                    value={config.model}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, model: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 bg-white"
                    disabled={availableModels.length === 0}
                  >
                    {availableModels.length === 0 ? (
                      <option value={config.model}>{config.model || '请先测试连接获取可用模型'}</option>
                    ) : (
                      availableModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {availableModels.length === 0
                      ? '请先点击"测试连接"按钮获取可用模型列表'
                      : `已检测到 ${availableModels.length} 个可用模型`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API密钥（可选）
                  </label>
                  <input
                    type="text"
                    value={config.apiKey}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                    }
                    placeholder="留空表示无需认证"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ollama本地服务通常不需要API密钥
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Zap size={20} className="text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900">模型参数</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    温度参数
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={config.temperature}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    控制输出随机性，0=确定性，1=最大随机性
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最大输出Token数
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="16384"
                    value={config.maxTokens}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        maxTokens: parseInt(e.target.value),
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    限制单次回复的最大Token数量
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        深度思考模式
                      </label>
                      <p className="text-xs text-gray-500">
                        开启后模型会展示思考过程，提升回答质量但增加响应时间
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          enableDeepThinking: !prev.enableDeepThinking,
                        }))
                      }
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        config.enableDeepThinking
                          ? 'bg-primary-500'
                          : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          config.enableDeepThinking ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 px-6 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    保存配置
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all"
              >
                恢复默认
              </button>
            </div>

            {saveMessage && (
              <div
                className={`p-4 rounded-xl text-sm flex items-start gap-3 animate-fade-in ${
                  saveMessage.includes('成功')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {saveMessage.includes('成功') ? (
                  <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={18} className="flex-shrink-0 mt-0.5" />
                )}
                <span className="font-medium">{saveMessage}</span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Bot size={20} className="text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900">连接测试</h2>
              </div>

              <button
                onClick={handleTest}
                disabled={isTesting}
                className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-3 px-6 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg mb-6"
              >
                {isTesting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <RefreshCw size={18} />
                    测试连接
                  </>
                )}
              </button>

              {testResult && (
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl flex items-start gap-3 ${
                      testResult.online && testResult.modelLoaded
                        ? 'bg-green-50 text-green-700'
                        : testResult.online && testResult.modelDownloaded && !testResult.modelLoaded
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {testResult.online && testResult.modelLoaded ? (
                      <CheckCircle2 size={20} className="flex-shrink-0 mt-0.5" />
                    ) : testResult.online && testResult.modelDownloaded && !testResult.modelLoaded ? (
                      <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">
                        {testResult.online && testResult.modelLoaded
                          ? '✅ 连接成功'
                          : testResult.online && testResult.modelDownloaded && !testResult.modelLoaded
                          ? '⚠️ 模型未加载'
                          : '❌ 连接失败'}
                      </p>
                      {testResult.message ? (
                        <p className="text-sm mt-1">{testResult.message}</p>
                      ) : testResult.error ? (
                        <p className="text-sm mt-1">{testResult.error}</p>
                      ) : null}
                    </div>
                  </div>

                  {testResult.availableModels &&
                    testResult.availableModels.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText size={16} className="text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            可用模型列表
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {testResult.availableModels.map((model) => (
                            <span
                              key={model}
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                model === config.model
                                  ? 'bg-primary-100 text-primary-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {model}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {testResult && testResult.online && testResult.modelDownloaded && !testResult.modelLoaded && (
                    <button
                      onClick={handleStartModel}
                      disabled={isStarting}
                      className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 px-6 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isStarting ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          启动中...
                        </>
                      ) : (
                        <>
                          <Zap size={18} />
                          启动模型 {config.model}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {!testResult && (
                <div className="p-4 rounded-xl bg-gray-50 text-gray-500 text-sm">
                  点击"测试连接"按钮验证配置是否正确
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-3">配置说明</h3>
              <ul className="space-y-2 text-white/80 text-sm">
                <li className="flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>确保Ollama服务已启动: <code className="bg-white/20 px-1 rounded">ollama serve</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>确保目标模型已下载: <code className="bg-white/20 px-1 rounded">ollama pull {config.model}</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>配置保存后立即生效，无需重启服务</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelConfigPage;
