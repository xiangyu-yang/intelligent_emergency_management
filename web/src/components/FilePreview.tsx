import { useState, useEffect } from 'react';
import { X, FileText, FileCode, FileJson, File, Loader2, Download, Copy, Check, Eye } from 'lucide-react';
import { apiClient } from '../api/client';
import MarkdownPreview from '@uiw/react-markdown-preview';

interface FilePreviewProps {
  skillId: string;
  filePath: string;
  fileName: string;
  onClose: () => void;
}

interface FileContent {
  content: string;
  fileName: string;
  fileType: string;
  size: number;
  modifiedAt: string;
}

function FilePreview({ skillId, filePath, fileName, onClose }: FilePreviewProps) {
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');

  useEffect(() => {
    fetchFileContent();
  }, [skillId, filePath]);

  const fetchFileContent = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/skills/${skillId}/resources/${encodeURIComponent(filePath)}`);
      if (response.code === 0) {
        setFileContent(response.data);
      } else {
        setError(response.message || '获取文件内容失败');
      }
    } catch (err: any) {
      setError(err.message || '获取文件内容失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (fileContent?.content) {
      await navigator.clipboard.writeText(fileContent.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (fileContent?.content) {
      const blob = new Blob([fileContent.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const getFileIcon = (fileType: string) => {
    const icons: Record<string, React.ReactNode> = {
      md: <FileText size={20} className="text-purple-500" />,
      txt: <FileText size={20} className="text-gray-400" />,
      py: <FileCode size={20} className="text-blue-500" />,
      js: <FileCode size={20} className="text-yellow-500" />,
      ts: <FileCode size={20} className="text-blue-600" />,
      json: <FileJson size={20} className="text-yellow-500" />,
      css: <FileCode size={20} className="text-pink-500" />,
      html: <FileCode size={20} className="text-orange-500" />,
    };
    return icons[fileType] || <File size={20} className="text-gray-400" />;
  };

  const getFileTypeName = (fileType: string) => {
    const names: Record<string, string> = {
      md: 'Markdown',
      txt: '文本',
      py: 'Python',
      js: 'JavaScript',
      ts: 'TypeScript',
      json: 'JSON',
      css: 'CSS',
      html: 'HTML',
    };
    return names[fileType] || '文件';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="animate-spin text-primary-500" />
            <span className="text-gray-500">加载中...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-2">
            <span className="text-red-500">{error}</span>
            <button
              onClick={fetchFileContent}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    if (!fileContent) {
      return null;
    }

    const { content, fileType } = fileContent;

    if (fileType === 'md') {
      if (viewMode === 'raw') {
        return (
          <div className="font-mono text-sm overflow-auto">
            <pre className="whitespace-pre-wrap text-gray-700">{content}</pre>
          </div>
        );
      }
      return (
        <MarkdownPreview
          source={content}
          style={{ fontSize: '14px' }}
        />
      );
    }

    if (fileType === 'json') {
      try {
        const parsed = JSON.parse(content);
        return (
          <div className="font-mono text-sm overflow-auto">
            <pre className="whitespace-pre-wrap text-gray-700">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>
        );
      } catch {
        return (
          <div className="font-mono text-sm overflow-auto">
            <pre className="whitespace-pre-wrap text-gray-700">{content}</pre>
          </div>
        );
      }
    }

    if (['py', 'js', 'ts', 'css', 'html'].includes(fileType)) {
      return (
        <div className="font-mono text-sm overflow-auto">
          <pre className="whitespace-pre-wrap text-gray-700">{content}</pre>
        </div>
      );
    }

    return (
      <div className="font-mono text-sm overflow-auto">
        <pre className="whitespace-pre-wrap text-gray-700">{content}</pre>
      </div>
    );
  };

  const canRender = fileContent?.fileType === 'md';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            {getFileIcon(fileContent?.fileType || fileName.split('.').pop() || '')}
            <div>
              <h3 className="font-semibold text-gray-900 truncate max-w-md">
                {fileName}
              </h3>
              <p className="text-sm text-gray-500">
                {getFileTypeName(fileContent?.fileType || '')} · {fileContent ? formatSize(fileContent.size) : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canRender && (
              <button
                onClick={() => setViewMode(viewMode === 'rendered' ? 'raw' : 'rendered')}
                className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors ${
                  viewMode === 'rendered'
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Eye size={16} />
                {viewMode === 'rendered' ? '渲染视图' : '原始视图'}
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="复制内容"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="下载文件"
            >
              <Download size={16} />
              下载
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] bg-white">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default FilePreview;