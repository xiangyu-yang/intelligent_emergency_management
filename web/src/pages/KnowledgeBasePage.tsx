import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Search,
  Upload,
  Grid,
  List,
  Filter,
  FileText,
  File,
  FileSpreadsheet,
  FileCode,
  Trash2,
  RefreshCw,
  Eye,
  X,
  Clock,
  Layers,
  Database,
  Zap,
  Settings,
  Copy,
  Check,
  SlidersHorizontal,
  Sparkles,
  BookOpen,
  Plus,
  AlertCircle,
  CheckCircle,
  Loader2,
  Hash,
  Dock,
} from 'lucide-react';
import { ragApi, RagDocument, RagChunk, SearchResult as ApiSearchResult } from '../api/rag';

type DocType = 'pdf' | 'txt' | 'md' | 'docx' | 'xlsx';
type DocStatus = 'uploading' | 'processing' | 'ready' | 'failed';
type ViewMode = 'grid' | 'list';
type TabType = 'documents' | 'search';
type SearchStrategy = 'vector' | 'hybrid';
type ChunkStrategy = 'fixed_size' | 'hierarchical' | 'semantic';

interface ChunkStrategyOption {
  id: ChunkStrategy;
  name: string;
  description: string;
}

const chunkStrategies: ChunkStrategyOption[] = [
  { id: 'fixed_size', name: '固定长度', description: '按字符数均匀分割，适合结构化文档' },
  { id: 'hierarchical', name: '父子层次', description: '先按章节分割，再细分，保持文档结构' },
  { id: 'semantic', name: '语义向量', description: '按句子边界分割，保持语义完整性' },
];

interface DocumentChunk {
  id: string;
  index: number;
  content: string;
  page?: number;
  section?: string;
  tokenCount: number;
}

interface SearchResultItem {
  id: string;
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  score: number;
  page?: number;
  section?: string;
}

const categories = [
  { id: 'all', name: '全部分类' },
  { id: '1-1', name: '洪涝灾害' },
  { id: '1-2', name: '地震灾害' },
  { id: '1-3', name: '气象灾害' },
  { id: '2-1', name: '安全生产事故' },
  { id: '2-2', name: '交通事故' },
  { id: '2-3', name: '火灾事故' },
  { id: '3-1', name: '传染病疫情' },
  { id: '5-1', name: '总体预案' },
  { id: '6-1', name: '法律法规' },
];

const allTags = [
  '应急响应', '抢险救援', '医疗救护', '疏散安置', '物资保障',
  '交通管制', '通讯保障', '水质监测', '疫情防控', '心理援助',
  '灾后重建', '风险评估', '预警预报', '应急演练', '队伍建设',
];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const getDocType = (fileType: string): DocType => {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return 'pdf';
  if (type.includes('docx') || type.includes('word')) return 'docx';
  if (type.includes('xlsx') || type.includes('xls') || type.includes('excel')) return 'xlsx';
  if (type.includes('markdown') || type.includes('md')) return 'md';
  return 'txt';
};

const getDocIcon = (type: DocType) => {
  switch (type) {
    case 'pdf':
      return <FileText className="text-red-500" size={24} />;
    case 'docx':
      return <FileSpreadsheet className="text-blue-500" size={24} />;
    case 'xlsx':
      return <FileSpreadsheet className="text-green-500" size={24} />;
    case 'md':
      return <FileCode className="text-purple-500" size={24} />;
    case 'txt':
      return <File className="text-gray-500" size={24} />;
  }
};

const getStatusConfig = (status: DocStatus) => {
  switch (status) {
    case 'uploading':
      return { label: '上传中', className: 'bg-blue-100 text-blue-700', icon: Loader2 };
    case 'processing':
      return { label: '处理中', className: 'bg-yellow-100 text-yellow-700', icon: Loader2 };
    case 'ready':
      return { label: '就绪', className: 'bg-green-100 text-green-700', icon: CheckCircle };
    case 'failed':
      return { label: '失败', className: 'bg-red-100 text-red-700', icon: AlertCircle };
  }
};

const mapRagDocumentToDocument = (doc: RagDocument) => ({
  id: doc.id,
  title: doc.title,
  fileName: doc.fileName,
  type: getDocType(doc.fileType),
  size: doc.fileSize,
  category: doc.category || '',
  categoryId: doc.category || '',
  tags: doc.tags || [],
  status: doc.status as DocStatus,
  chunkCount: doc.totalChunks,
  chunkSize: doc.chunkSize,
  chunkOverlap: doc.chunkOverlap,
  createTime: formatDateTime(doc.createdAt),
  chunks: [] as DocumentChunk[],
});

const mapRagChunkToChunk = (chunk: RagChunk): DocumentChunk => ({
  id: chunk.id,
  index: chunk.chunkIndex,
  content: chunk.content,
  page: chunk.metadata?.page || Math.floor(chunk.chunkIndex / 3) + 1,
  section: chunk.metadata?.section || `第${chunk.chunkIndex + 1}节`,
  tokenCount: chunk.tokenCount,
});

const mapApiSearchResult = (result: ApiSearchResult): SearchResultItem => ({
  id: result.chunkId,
  documentId: result.documentId,
  documentTitle: result.document?.title || '',
  chunkIndex: result.chunkIndex,
  content: result.content,
  similarity: result.similarity,
  score: result.score,
  page: result.metadata?.page,
  section: result.metadata?.section,
});

function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<RagDocument | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<DocumentChunk | null>(null);
  const [docChunks, setDocChunks] = useState<RagChunk[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRechunkModal, setShowRechunkModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('1-1');
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [uploadChunkStrategy, setUploadChunkStrategy] = useState<ChunkStrategy>('fixed_size');
  const [uploadChunkSize, setUploadChunkSize] = useState(500);
  const [uploadChunkOverlap, setUploadChunkOverlap] = useState(50);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [rechunkStrategy, setRechunkStrategy] = useState<ChunkStrategy>('fixed_size');
  const [rechunkSize, setRechunkSize] = useState(500);
  const [rechunkOverlap, setRechunkOverlap] = useState(50);
  const [isRechunking, setIsRechunking] = useState(false);

  const [queryText, setQueryText] = useState('');
  const [topK, setTopK] = useState(5);
  const [searchStrategy, setSearchStrategy] = useState<SearchStrategy>('hybrid');
  const [enableRerank, setEnableRerank] = useState(true);
  const [minSimilarity, setMinSimilarity] = useState(0.2);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [contextChunks, setContextChunks] = useState<SearchResultItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [contextText, setContextText] = useState('');
  const [totalTokens, setTotalTokens] = useState(0);
  const [isBuildingContext, setIsBuildingContext] = useState(false);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewServiceRunning, setPreviewServiceRunning] = useState(false);
  const [startingPreviewService, setStartingPreviewService] = useState(false);
  const [dockerRunning, setDockerRunning] = useState(false);
  const [startingDocker, setStartingDocker] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    setError(null);
    try {
      const params: {
        keyword?: string;
        category?: string;
      } = {};
      if (searchText.trim()) {
        params.keyword = searchText.trim();
      }
      if (selectedCategory !== 'all') {
        const categoryName = categories.find((c) => c.id === selectedCategory)?.name;
        if (categoryName) {
          params.category = categoryName;
        }
      }
      const result = await ragApi.getDocuments(params);
      setDocuments(result.list);
    } catch (err: any) {
      setError(err.message || '加载文档列表失败');
    } finally {
      setIsLoadingDocs(false);
    }
  }, [searchText, selectedCategory]);

  const fetchChunks = useCallback(async (documentId: string) => {
    setIsLoadingChunks(true);
    try {
      const result = await ragApi.getChunks(documentId, { page: 1, pageSize: 100 });
      setDocChunks(result.list);
    } catch (err: any) {
      setError(err.message || '加载分片失败');
    } finally {
      setIsLoadingChunks(false);
    }
  }, []);

  const needsPolling = (docs: RagDocument[]) => {
    return docs.some((d) => d.status === 'processing' || d.status === 'uploading');
  };

  const pollDocumentStatus = useCallback(async () => {
    try {
      const result = await ragApi.getDocuments({ pageSize: 100 });
      setDocuments(result.list);

      if (selectedDoc && (selectedDoc.status === 'processing' || selectedDoc.status === 'uploading')) {
        const updatedDoc = result.list.find((d) => d.id === selectedDoc.id);
        if (updatedDoc) {
          setSelectedDoc(updatedDoc);
          if (updatedDoc.status === 'ready' || updatedDoc.status === 'failed') {
            fetchChunks(updatedDoc.id);
          }
        }
      }

      if (!needsPolling(result.list)) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch (err) {
      console.error('轮询文档状态失败:', err);
    }
  }, [selectedDoc, fetchChunks]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(pollDocumentStatus, 2000);
  }, [pollDocumentStatus]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (needsPolling(documents) && !pollingRef.current) {
      startPolling();
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [documents, startPolling]);

  const handleSelectDoc = async (doc: RagDocument) => {
    setSelectedDoc(doc);
    setSelectedChunk(null);
    setDocChunks([]);
    if (doc.status === 'ready') {
      fetchChunks(doc.id);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setUploadFile(files[0]);
      if (!uploadTitle) {
        setUploadTitle(files[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [uploadTitle]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadFile(files[0]);
      if (!uploadTitle) {
        setUploadTitle(files[0].name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) return;

    setIsUploading(true);
    setError(null);

    try {
      const categoryName = categories.find((c) => c.id === uploadCategory)?.name;
      const newDoc = await ragApi.uploadDocument(uploadFile, {
        title: uploadTitle,
        category: categoryName,
        tags: uploadTags,
        chunkStrategy: uploadChunkStrategy,
        chunkSize: uploadChunkSize,
        chunkOverlap: uploadChunkOverlap,
      });

      setDocuments((prev) => [newDoc, ...prev]);
      startPolling();

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadTags([]);
      setUploadChunkSize(500);
      setUploadChunkOverlap(50);
    } catch (err: any) {
      setError(err.message || '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const toggleUploadTag = (tag: string) => {
    if (uploadTags.includes(tag)) {
      setUploadTags(uploadTags.filter((t) => t !== tag));
    } else {
      setUploadTags([...uploadTags, tag]);
    }
  };

  const handleRechunk = async () => {
    if (!selectedDoc) return;

    setIsRechunking(true);
    setShowRechunkModal(false);
    setError(null);

    try {
      const updatedDoc = await ragApi.rechunkDocument(selectedDoc.id, {
        chunkStrategy: rechunkStrategy,
        chunkSize: rechunkSize,
        chunkOverlap: rechunkOverlap,
      });

      console.log('[Rechunk] Updated doc:', updatedDoc);

      if (updatedDoc && updatedDoc.id) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === selectedDoc.id ? updatedDoc : d))
        );
        setSelectedDoc(updatedDoc);
        startPolling();
        
        if (updatedDoc.status === 'ready') {
          fetchChunks(updatedDoc.id);
        }
      } else {
        throw new Error('重新分片失败：返回数据格式错误');
      }
    } catch (err: any) {
      console.error('[Rechunk] Error:', err);
      setError(err.message || '重新分片失败');
    } finally {
      setIsRechunking(false);
    }
  };

  const handleSearch = async () => {
    if (!queryText.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setError(null);
    setHasSearched(true);

    try {
      const results = await ragApi.search({
        query: queryText,
        topK,
        useRerank: enableRerank,
        searchStrategy,
      });

      console.log('[Search] API results:', results);

      const mapped = results
        .map(mapApiSearchResult)
        .filter((r) => r.score >= minSimilarity);

      console.log('[Search] Mapped results:', mapped);
      console.log('[Search] minSimilarity:', minSimilarity);

      setSearchResults(mapped);
      setContextChunks(mapped);
      setTotalTokens(mapped.reduce((sum, c) => sum + Math.floor(c.content.length / 2), 0));
    } catch (err: any) {
      console.error('[Search] Error:', err);
      setError(err.message || '检索失败');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBuildContext = async () => {
    if (!queryText.trim()) return;

    setIsBuildingContext(true);
    setError(null);

    try {
      const result = await ragApi.getContext({
        query: queryText,
        topK,
        useRerank: enableRerank,
        searchStrategy,
      });

      setContextText(result.context);
      setTotalTokens(result.totalTokens);
      setContextChunks(result.chunks.map(mapApiSearchResult));
    } catch (err: any) {
      setError(err.message || '构建上下文失败');
    } finally {
      setIsBuildingContext(false);
    }
  };

  const addToContext = (result: SearchResultItem) => {
    if (!contextChunks.find((c) => c.id === result.id)) {
      const newChunks = [...contextChunks, result];
      setContextChunks(newChunks);
      setTotalTokens(newChunks.reduce((sum, c) => sum + Math.floor(c.content.length / 2), 0));
    }
  };

  const removeFromContext = (resultId: string) => {
    const newChunks = contextChunks.filter((c) => c.id !== resultId);
    setContextChunks(newChunks);
    setTotalTokens(newChunks.reduce((sum, c) => sum + Math.floor(c.content.length / 2), 0));
  };

  const buildContextText = () => {
    return contextChunks
      .map((chunk, idx) => `[片段${idx + 1}] 来源: ${chunk.documentTitle} (第${chunk.page}页)\n${chunk.content}`)
      .join('\n\n---\n\n');
  };

  const copyToClipboard = () => {
    const text = contextText || buildContextText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const estimateChunkCount = (size: number, overlap: number) => {
    if (!selectedDoc) return 0;
    const avgCharPerChunk = size - overlap;
    if (avgCharPerChunk <= 0) return 0;
    const contentLength = selectedDoc.charCount || selectedDoc.fileSize;
    return Math.max(1, Math.ceil(contentLength / avgCharPerChunk));
  };

  const openRechunkModal = () => {
    if (selectedDoc) {
      setRechunkStrategy(selectedDoc.chunkStrategy as ChunkStrategy || 'fixed_size');
      setRechunkSize(selectedDoc.chunkSize);
      setRechunkOverlap(selectedDoc.chunkOverlap);
      setShowRechunkModal(true);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('确定要删除这个文档吗？')) return;

    try {
      await ragApi.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
        setSelectedChunk(null);
        setDocChunks([]);
      }
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  const startDockerService = async () => {
    setStartingDocker(true);
    try {
      const result = await ragApi.startDockerService();
      setDockerRunning(result.running);
      return result.running;
    } catch (err: any) {
      setError(err.message || '启动Docker失败');
      return false;
    } finally {
      setStartingDocker(false);
    }
  };

  const startPreviewService = async () => {
    setStartingPreviewService(true);
    try {
      const result = await ragApi.startPreviewService();
      if (result.dockerRunning !== undefined) {
        setDockerRunning(result.dockerRunning);
      }
      setPreviewServiceRunning(result.running);
      
      if (result.running && previewDocId) {
        const preview = await ragApi.getPreviewUrl(previewDocId);
        setPreviewUrl(preview.previewUrl);
      }
      
      return result.running;
    } catch (err: any) {
      setError(err.message || '启动预览服务失败');
      return false;
    } finally {
      setStartingPreviewService(false);
    }
  };

  const openPreview = async (doc: RagDocument) => {
    if (doc.status !== 'ready') {
      setError('文档尚未处理完成，无法预览');
      return;
    }

    setPreviewLoading(true);
    setShowPreviewModal(true);
    setPreviewUrl(null);
    setPreviewDocId(doc.id);

    try {
      const status = await ragApi.getPreviewStatus();
      setDockerRunning(status.dockerRunning);
      setPreviewServiceRunning(status.running);

      if (!status.dockerRunning) {
        setPreviewLoading(false);
        return;
      }

      if (!status.running) {
        setPreviewLoading(false);
        return;
      }

      const preview = await ragApi.getPreviewUrl(doc.id);
      setPreviewUrl(preview.previewUrl);
    } catch (err: any) {
      setError(err.message || '获取预览地址失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const displayDocuments = documents.map(mapRagDocumentToDocument);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RAG知识库</h1>
          <p className="mt-1 text-sm text-gray-500">文档管理与智能检索</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'documents'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database size={18} />
              文档管理
            </div>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              智能检索
            </div>
          </button>
        </div>

        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="border-r border-gray-100">
              <div className="p-4 border-b border-gray-100 space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                  >
                    <Upload size={18} />
                    上传文档
                  </button>
                  <div className="flex-1 relative">
                    <Search size={18} className="text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="搜索文档标题..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-500" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-400'}`}
                    >
                      <Grid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-400'}`}
                    >
                      <List size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-3 text-sm text-gray-500">
                  共 <span className="font-medium text-primary-600">{displayDocuments.length}</span> 个文档
                </div>
                {isLoadingDocs ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-100 rounded-lg p-4 animate-pulse"
                      >
                        <div className="h-5 bg-gray-200 rounded w-2/3 mb-3"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    ))}
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {displayDocuments.map((doc) => {
                      const statusConfig = getStatusConfig(doc.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => handleSelectDoc(documents.find((d) => d.id === doc.id)!)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            selectedDoc?.id === doc.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            {getDocIcon(doc.type)}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm truncate">{doc.title}</h4>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{doc.fileName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${statusConfig.className}`}>
                              <StatusIcon size={12} className={doc.status === 'processing' || doc.status === 'uploading' ? 'animate-spin' : ''} />
                              {statusConfig.label}
                            </span>
                            <span className="text-xs text-gray-500">{formatFileSize(doc.size)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Layers size={12} />
                              {doc.chunkCount} 分片
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {doc.createTime}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayDocuments.map((doc) => {
                      const statusConfig = getStatusConfig(doc.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => handleSelectDoc(documents.find((d) => d.id === doc.id)!)}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedDoc?.id === doc.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {getDocIcon(doc.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 text-sm truncate">{doc.title}</h4>
                                <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${statusConfig.className} flex-shrink-0`}>
                                  <StatusIcon size={10} className={doc.status === 'processing' || doc.status === 'uploading' ? 'animate-spin' : ''} />
                                  {statusConfig.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                <span>{doc.category}</span>
                                <span>{formatFileSize(doc.size)}</span>
                                <span className="flex items-center gap-1">
                                  <Layers size={12} />
                                  {doc.chunkCount} 分片
                                </span>
                                <span>{doc.createTime}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-[600px]">
              {selectedDoc ? (
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        {getDocIcon(getDocType(selectedDoc.fileType))}
                        <div>
                          <h3 className="font-semibold text-gray-900">{selectedDoc.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{selectedDoc.fileName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openPreview(selectedDoc)}
                          disabled={selectedDoc.status !== 'ready'}
                          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="预览文档"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => deleteDocument(selectedDoc.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">文件大小</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{formatFileSize(selectedDoc.fileSize)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">分片数量</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedDoc.totalChunks}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">状态</p>
                        <p className="text-sm font-medium mt-1">
                          <span className={getStatusConfig(selectedDoc.status as DocStatus).className + ' px-2 py-0.5 rounded-full text-xs'}>
                            {getStatusConfig(selectedDoc.status as DocStatus).label}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Settings size={16} className="text-primary-600" />
                        分片策略
                      </h4>
                      <button
                        onClick={openRechunkModal}
                        disabled={selectedDoc.status === 'processing' || selectedDoc.status === 'uploading' || isRechunking}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={14} className={isRechunking ? 'animate-spin' : ''} />
                        重新分片
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">分片大小</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedDoc.chunkSize} 字符</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">重叠大小</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedDoc.chunkOverlap} 字符</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Layers size={16} className="text-primary-600" />
                      分片列表
                    </h4>
                    {isLoadingChunks ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="bg-gray-50 border border-gray-100 rounded-lg p-4 animate-pulse"
                          >
                            <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                          </div>
                        ))}
                      </div>
                    ) : docChunks.length > 0 ? (
                      <div className="space-y-2">
                        {docChunks.map((chunk) => {
                          const mappedChunk = mapRagChunkToChunk(chunk);
                          return (
                            <div
                              key={chunk.id}
                              onClick={() => setSelectedChunk(mappedChunk)}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                selectedChunk?.id === chunk.id
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded">
                                  分片 {chunk.chunkIndex + 1}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {chunk.tokenCount} tokens
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">{chunk.content}</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Hash size={12} />
                                  第{mappedChunk.page}页
                                </span>
                                <span>{mappedChunk.section}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Layers size={48} className="mx-auto mb-3 text-gray-300" />
                        <p>{selectedDoc.status === 'ready' ? '暂无分片数据' : '文档处理中，请稍候...'}</p>
                      </div>
                    )}
                  </div>

                  {selectedChunk && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 text-sm">分片 {selectedChunk.index + 1} 内容</h5>
                        <button
                          onClick={() => setSelectedChunk(null)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedChunk.content}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BookOpen size={64} className="mx-auto mb-4 text-gray-300" />
                    <p>请选择一个文档查看详情</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="p-6">
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    输入您的问题
                  </label>
                  <div className="relative">
                    <textarea
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      placeholder="请输入您的查询问题，系统将从知识库中检索相关内容..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          handleSearch();
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    提示：按 Cmd/Ctrl + Enter 快速检索
                  </p>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !queryText.trim()}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isSearching ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Search size={20} />
                  )}
                  {isSearching ? '检索中...' : '智能检索'}
                </button>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Top K: {topK}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={topK}
                    onChange={(e) => setTopK(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    检索策略
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSearchStrategy('vector')}
                      className={`flex-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        searchStrategy === 'vector'
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      纯向量
                    </button>
                    <button
                      onClick={() => setSearchStrategy('hybrid')}
                      className={`flex-1 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        searchStrategy === 'hybrid'
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      混合检索
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    启用 Rerank
                  </label>
                  <button
                    onClick={() => setEnableRerank(!enableRerank)}
                    className={`w-full px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      enableRerank
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {enableRerank ? '已启用' : '已禁用'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    最小相关度: {minSimilarity.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={minSimilarity}
                    onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap size={18} className="text-primary-600" />
                  检索结果
                  {searchResults.length > 0 && (
                    <span className="text-sm font-normal text-gray-500">
                      ({searchResults.length} 条)
                    </span>
                  )}
                </h3>

                {isSearching ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-100 rounded-lg p-4 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
                        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      </div>
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map((result) => {
                      const isInContext = contextChunks.find((c) => c.id === result.id);
                      return (
                        <div
                          key={result.id}
                          className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-500 to-green-500 rounded-full"
                                  style={{ width: `${Math.min(result.score * 100, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-primary-600">
                                {(Math.min(result.score * 100, 100)).toFixed(1)}%
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                isInContext ? removeFromContext(result.id) : addToContext(result)
                              }
                              className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                                isInContext
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                              }`}
                            >
                              {isInContext ? (
                                <span className="flex items-center gap-1">
                                  <Check size={14} />
                                  已加入
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Plus size={14} />
                                  加入上下文
                                </span>
                              )}
                            </button>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-3 mb-3">{result.content}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <FileText size={12} />
                                {result.documentTitle}
                              </span>
                              <span className="flex items-center gap-1">
                                <Hash size={12} />
                                第{result.page}页
                              </span>
                              <span>{result.section}</span>
                            </div>
                            <button className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                              <Eye size={12} />
                              查看原文
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Search size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">
                      {hasSearched ? '未找到相关结果，请尝试调整关键词或降低最小相关度' : '输入查询开始检索'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database size={18} className="text-primary-600" />
                    上下文构建结果
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-normal text-gray-500">
                      {totalTokens.toLocaleString()} tokens
                    </span>
                    <button
                      onClick={handleBuildContext}
                      disabled={isBuildingContext || !queryText.trim()}
                      className="text-sm px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBuildingContext ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      {isBuildingContext ? '构建中...' : '构建上下文'}
                    </button>
                    <button
                      onClick={copyToClipboard}
                      disabled={contextChunks.length === 0}
                      className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? '已复制' : '复制'}
                    </button>
                  </div>
                </h3>

                {contextChunks.length > 0 ? (
                  <div className="bg-gray-900 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                    <div className="space-y-4">
                      {contextChunks.map((chunk, idx) => (
                        <div key={chunk.id} className="relative group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-green-400">
                              [片段{idx + 1}] {chunk.documentTitle} · 第{chunk.page}页
                            </span>
                            <button
                              onClick={() => removeFromContext(chunk.id)}
                              className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-800 p-3 rounded">
                            {chunk.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Database size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">点击"加入上下文"构建上下文</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">上传文档</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                {uploadFile ? (
                  <div>
                    <p className="font-medium text-gray-900">{uploadFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatFileSize(uploadFile.size)}
                    </p>
                    <p className="text-xs text-primary-600 mt-2">点击重新选择</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-gray-900">拖拽文件到此处，或点击选择</p>
                    <p className="text-sm text-gray-500 mt-1">
                      支持 PDF、TXT、MD、DOCX、Excel 格式
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文档标题
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="请输入文档标题"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {categories.filter((c) => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签
                </label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleUploadTag(tag)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        uploadTags.includes(tag)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <SlidersHorizontal size={16} className="text-primary-600" />
                  分片策略配置
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      分片策略
                    </label>
                    <select
                      value={uploadChunkStrategy}
                      onChange={(e) => setUploadChunkStrategy(e.target.value as ChunkStrategy)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                      {chunkStrategies.map((strategy) => (
                        <option key={strategy.id} value={strategy.id}>
                          {strategy.name} - {strategy.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-700">
                        分片大小 (chunkSize)
                      </label>
                      <span className="text-sm font-medium text-gray-900">
                        {uploadChunkSize} 字符
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="50"
                      value={uploadChunkSize}
                      onChange={(e) => setUploadChunkSize(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>100</span>
                      <span>2000</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-gray-700">
                        分片重叠 (chunkOverlap)
                      </label>
                      <span className="text-sm font-medium text-gray-900">
                        {uploadChunkOverlap} 字符
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="10"
                      value={uploadChunkOverlap}
                      onChange={(e) => setUploadChunkOverlap(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>0</span>
                      <span>500</span>
                    </div>
                  </div>
                </div>
              </div>

              {isUploading && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">上传中...</span>
                    <span className="text-sm text-primary-600">
                      <Loader2 size={16} className="inline animate-spin mr-1" />
                      请稍候
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full animate-pulse"
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || !uploadFile || !uploadTitle}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                {isUploading ? '上传中...' : '开始上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRechunkModal && selectedDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">重新分片</h2>
              <button
                onClick={() => setShowRechunkModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">当前分片策略</h4>
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">策略类型</p>
                    <p className="font-medium text-gray-900">
                      {chunkStrategies.find(s => s.id === selectedDoc.chunkStrategy)?.name || selectedDoc.chunkStrategy}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">分片大小</p>
                    <p className="font-medium text-gray-900">{selectedDoc.chunkSize} 字符</p>
                  </div>
                  <div>
                    <p className="text-gray-500">重叠大小</p>
                    <p className="font-medium text-gray-900">{selectedDoc.chunkOverlap} 字符</p>
                  </div>
                  <div>
                    <p className="text-gray-500">分片数量</p>
                    <p className="font-medium text-gray-900">{selectedDoc.totalChunks}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分片策略
                  </label>
                  <select
                    value={rechunkStrategy}
                    onChange={(e) => setRechunkStrategy(e.target.value as ChunkStrategy)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    {chunkStrategies.map((strategy) => (
                      <option key={strategy.id} value={strategy.id}>
                        {strategy.name} - {strategy.description}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      分片大小 (chunkSize)
                    </label>
                    <span className="text-sm font-medium text-primary-600">
                      {rechunkSize} 字符
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={rechunkSize}
                    onChange={(e) => setRechunkSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      分片重叠 (chunkOverlap)
                    </label>
                    <span className="text-sm font-medium text-primary-600">
                      {rechunkOverlap} 字符
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={rechunkOverlap}
                    onChange={(e) => setRechunkOverlap(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  />
                </div>
              </div>

              <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">预估分片数量</span>
                  <span className="text-lg font-bold text-primary-600">
                    {estimateChunkCount(rechunkSize, rechunkOverlap)} 个
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowRechunkModal(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleRechunk}
                disabled={isRechunking}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRechunking ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <RefreshCw size={18} />
                )}
                {isRechunking ? '处理中...' : '确认重新分片'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <Eye size={20} className="text-primary-600" />
                <h2 className="text-lg font-bold text-gray-900">文档预览</h2>
                {selectedDoc && (
                  <span className="text-sm text-gray-500">{selectedDoc.title}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!dockerRunning ? (
                  <button
                    onClick={startDockerService}
                    disabled={startingDocker}
                    className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {startingDocker ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Dock size={14} />
                    )}
                    {startingDocker ? '启动中...' : '启动Docker服务'}
                  </button>
                ) : !previewServiceRunning ? (
                  <button
                    onClick={startPreviewService}
                    disabled={startingPreviewService}
                    className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {startingPreviewService ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {startingPreviewService ? '启动中...' : '启动预览服务'}
                  </button>
                ) : (
                  <span className="px-3 py-1.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    预览服务运行中
                  </span>
                )}
                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewUrl(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-100">
              {previewLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 size={48} className="mx-auto mb-4 text-primary-600 animate-spin" />
                    <p className="text-gray-500">正在加载预览...</p>
                  </div>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full min-h-[600px] border-0"
                  title="文档预览"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : !dockerRunning ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <Dock size={48} className="mx-auto mb-4 text-amber-500" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Docker服务未启动</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      文档预览功能需要 Docker 服务支持。请点击上方"启动Docker服务"按钮启动 Docker。
                    </p>
                  </div>
                </div>
              ) : !previewServiceRunning ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <AlertCircle size={48} className="mx-auto mb-4 text-amber-500" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">预览服务未启动</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      文档预览功能需要 kkfileview 服务支持。请点击上方"启动预览服务"按钮启动服务。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-amber-500" />
                    <p className="text-gray-500">无法获取预览地址</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBasePage;
