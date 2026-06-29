import apiClient from './client';

export interface RagDocument {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  category?: string;
  tags: string[];
  chunkStrategy: string;
  chunkSize: number;
  chunkOverlap: number;
  totalChunks: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RagChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface SearchResult {
  chunkId: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  score: number;
  similarity: number;
  metadata?: Record<string, any>;
  document?: {
    id: string;
    title: string;
    fileName?: string;
    fileType?: string;
    category?: string;
  };
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const ragApi = {
  uploadDocument: async (file: File, params?: {
    title?: string;
    category?: string;
    tags?: string[];
    chunkStrategy?: 'fixed_size' | 'hierarchical' | 'semantic';
    chunkSize?: number;
    chunkOverlap?: number;
  }): Promise<RagDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    if (params?.title) formData.append('title', params.title);
    if (params?.category) formData.append('category', params.category);
    if (params?.tags) formData.append('tags', JSON.stringify(params.tags));
    if (params?.chunkStrategy) formData.append('chunkStrategy', params.chunkStrategy);
    if (params?.chunkSize) formData.append('chunkSize', String(params.chunkSize));
    if (params?.chunkOverlap) formData.append('chunkOverlap', String(params.chunkOverlap));

    const response = await fetch('/api/rag/upload', {
      method: 'POST',
      body: formData,
    });
    const result = await response.json();
    if (result.code !== 0) {
      throw new Error(result.message || '上传失败');
    }
    return result.data;
  },

  getDocuments: async (params?: {
    page?: number;
    pageSize?: number;
    category?: string;
    status?: string;
    keyword?: string;
  }): Promise<PaginatedResponse<RagDocument> & { categories: string[] }> => {
    const result = await apiClient.get('/rag/documents', { params });
    return (result as any).data;
  },

  getDocument: async (id: string): Promise<RagDocument & { chunkCount: number }> => {
    const result = await apiClient.get(`/rag/documents/${id}`);
    return (result as any).data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    const result = await apiClient.delete(`/rag/documents/${id}`);
    if ((result as any).code !== 0) {
      throw new Error((result as any).message || '删除失败');
    }
  },

  rechunkDocument: async (id: string, params: {
    chunkStrategy?: string;
    chunkSize?: number;
    chunkOverlap?: number;
  }): Promise<RagDocument> => {
    const result = await apiClient.post(`/rag/documents/${id}/rechunk`, params);
    const data = (result as any).data;
    return data?.document || data;
  },

  getChunks: async (documentId: string, params?: {
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<RagChunk> & { document: RagDocument }> => {
    const result = await apiClient.get(`/rag/documents/${documentId}/chunks`, { params });
    return (result as any).data;
  },

  search: async (params: {
    query: string;
    topK?: number;
    useRerank?: boolean;
    searchStrategy?: 'vector' | 'hybrid';
    documentIds?: string[];
  }): Promise<SearchResult[]> => {
    const result = await apiClient.post('/rag/search', params);
    const data = (result as any).data;
    return data?.results || data || [];
  },

  getContext: async (params: {
    query: string;
    topK?: number;
    maxTokens?: number;
    useRerank?: boolean;
    searchStrategy?: 'vector' | 'hybrid';
  }): Promise<{ context: string; chunks: SearchResult[]; totalTokens: number }> => {
    const result = await apiClient.post('/rag/context', params);
    const data = (result as any).data;
    return {
      context: data?.context || '',
      chunks: data?.chunks || [],
      totalTokens: data?.totalTokens || 0,
    };
  },

  getPreviewStatus: async (): Promise<{ dockerRunning: boolean; running: boolean; url: string }> => {
    const result = await apiClient.get('/rag/preview/status');
    return (result as any).data;
  },

  startDockerService: async (): Promise<{ running: boolean }> => {
    const result = await apiClient.post('/rag/docker/start');
    return (result as any).data;
  },

  startPreviewService: async (): Promise<{ running: boolean; dockerRunning: boolean }> => {
    const result = await apiClient.post('/rag/preview/start');
    return (result as any).data;
  },

  getPreviewUrl: async (documentId: string): Promise<{
    running: boolean;
    previewUrl: string | null;
    fileUrl: string;
    kkfileviewUrl: string;
    document: {
      id: string;
      title: string;
      fileName: string;
      fileType: string;
    };
  }> => {
    const result = await apiClient.get(`/rag/preview/${documentId}`);
    const data = (result as any).data;
    if (!data) {
      throw new Error('获取预览地址失败');
    }
    return data;
  },
};

export default ragApi;
