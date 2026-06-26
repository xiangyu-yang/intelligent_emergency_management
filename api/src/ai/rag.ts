import fs from 'fs';
import path from 'path';
import { Tiktoken, get_encoding } from '@dqbd/tiktoken';
import { RagDocumentDAO, RagChunkDAO, type RagDocument, type RagChunk } from '../db/dao.js';
import { nanoid } from 'nanoid';
import { parseJSON, stringifyJSON } from '../utils/common.js';

export type ChunkStrategy = 'fixed_size' | 'semantic' | 'recursive';
export type SearchStrategy = 'vector' | 'hybrid';
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed';
export type FileType = 'pdf' | 'txt' | 'md' | 'docx';

export interface ChunkConfig {
  strategy: ChunkStrategy;
  chunkSize: number;
  chunkOverlap: number;
}

export interface SearchOptions {
  query: string;
  topK?: number;
  useRerank?: boolean;
  searchStrategy?: SearchStrategy;
  documentIds?: string[];
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

let tokenizer: Tiktoken | null = null;

function getTokenizer(): Tiktoken {
  if (!tokenizer) {
    tokenizer = get_encoding('cl100k_base');
  }
  return tokenizer;
}

export function countTokens(text: string): number {
  const enc = getTokenizer();
  return enc.encode(text).length;
}

export interface ParseResult {
  content: string;
  metadata: {
    pageCount?: number;
    tableCount?: number;
    imageCount?: number;
    tables?: Array<{
      page: number;
      rows: number;
      cols: number;
      content: string;
    }>;
    images?: Array<{
      page: number;
      width?: number;
      height?: number;
      description?: string;
    }>;
    sections?: string[];
  };
}

export async function parsePDF(filePath: string): Promise<ParseResult> {
  try {
    const pdfParseModule = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    
    const uint8Array = new Uint8Array(dataBuffer);
    
    let text = '';
    let pageCount = 0;
    const tables: Array<{ page: number; rows: number; cols: number; content: string }> = [];
    let imageCount = 0;
    const images: Array<{ page: number; width?: number; height?: number }> = [];
    
    if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse(uint8Array);
      
      const infoResult = await parser.getInfo();
      pageCount = infoResult.total || 0;
      
      const textResult = await parser.getText();
      text = textResult.text || '';
      
      const tableResult = await parser.getTable();
      if (tableResult.mergedTables && tableResult.mergedTables.length > 0) {
        for (const table of tableResult.mergedTables) {
          if (table && table.length >= 2) {
            const maxCols = Math.max(...table.map((row: any[]) => row.length));
            if (maxCols >= 2) {
              const tableText = table.map((row: any[]) => '| ' + row.join(' | ') + ' |').join('\n');
              tables.push({
                page: 1,
                rows: table.length,
                cols: maxCols,
                content: tableText
              });
            }
          }
        }
      }
      
      const imageResult = await parser.getImage();
      imageCount = imageResult.total || 0;
      if (imageResult.pages && imageResult.pages.length > 0) {
        for (let i = 0; i < imageResult.pages.length; i++) {
          const pageImg = imageResult.pages[i];
          if (pageImg && pageImg.images && pageImg.images.length > 0) {
            for (const img of pageImg.images.slice(0, 5)) {
              images.push({
                page: i + 1,
                width: img.width,
                height: img.height
              });
            }
          }
        }
      }
      
      parser.destroy();
    } else {
      const pdfParse = (pdfParseModule as any).default || pdfParseModule;
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text || '';
      pageCount = pdfData.numpages || 0;
    }
    
    const cleanedContent = cleanText(text);
    
    const headingPattern = /^(第[一二三四五六七八九十百千]+[章节篇讲]|[\d]+\.[\d\s.]*[\u4e00-\u9fa5\w]+|[\u4e00-\u9fa5]{2,20}[:：]?$)/gm;
    const sections = cleanedContent.match(headingPattern)?.slice(0, 50) || [];
    
    return {
      content: cleanedContent,
      metadata: {
        pageCount,
        tableCount: tables.length,
        imageCount,
        tables: tables.slice(0, 20),
        images: images.slice(0, 20),
        sections: sections.filter(s => s.length > 2 && s.length < 50).slice(0, 30),
      }
    };
  } catch (e) {
    console.warn('[RAG] PDF parse error:', e);
    return { content: '', metadata: {} };
  }
}

export function parseTXT(filePath: string): ParseResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const cleanedContent = cleanText(content);
    
    const headingPattern = /^(第[一二三四五六七八九十百千]+[章节篇讲]|[\d]+\.[\d\s.]*[\u4e00-\u9fa5\w]+|[\u4e00-\u9fa5]{2,20}[:：]?$)/gm;
    const sections = cleanedContent.match(headingPattern)?.slice(0, 50) || [];
    
    return {
      content: cleanedContent,
      metadata: {
        sections: sections.filter(s => s.length > 2 && s.length < 50).slice(0, 30),
      }
    };
  } catch (e) {
    console.warn('[RAG] TXT parse error:', e);
    return { content: '', metadata: {} };
  }
}

export function parseMD(filePath: string): ParseResult {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const cleanedContent = cleanText(content);
    
    const sections = content.match(/^#{1,6}\s+.+$/gm)?.map(s => s.replace(/^#+\s*/, '')) || [];
    
    const tableCount = (content.match(/^\|.+\|$/gm) || []).length;
    
    const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    
    return {
      content: cleanedContent,
      metadata: {
        tableCount,
        imageCount,
        sections: sections.filter(s => s.length > 2 && s.length < 100).slice(0, 30),
      }
    };
  } catch (e) {
    console.warn('[RAG] MD parse error:', e);
    return { content: '', metadata: {} };
  }
}

export async function parseDOCX(filePath: string): Promise<ParseResult> {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(filePath);
    const xmlBuffer = zip.readFile('word/document.xml');

    if (!xmlBuffer) {
      throw new Error('无法读取Word文档内容');
    }

    let xmlContent = xmlBuffer.toString('utf-8');
    if (!xmlContent.includes('<?xml')) {
      xmlContent = xmlBuffer.toString('utf-16le');
    }
    
    const tables: Array<{ page: number; rows: number; cols: number; content: string }> = [];
    const tableMatches = xmlContent.match(/<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/g) || [];
    
    for (let i = 0; i < Math.min(tableMatches.length, 20); i++) {
      const tableXml = tableMatches[i];
      const rows = tableXml.match(/<w:tr[^>]*>/g) || [];
      
      let maxCols = 0;
      const rowTexts: string[] = [];
      
      const rowMatches = tableXml.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g) || [];
      for (const rowXml of rowMatches) {
        const cells = rowXml.match(/<w:tc[^>]*>[\s\S]*?<\/w:tc>/g) || [];
        maxCols = Math.max(maxCols, cells.length);
        
        const cellTexts = cells.map(cell => {
          let cellText = cell.replace(/<[^>]+>/g, '').trim();
          return cellText;
        });
        rowTexts.push(cellTexts.join(' | '));
      }
      
      if (rows.length >= 2 && maxCols >= 2) {
        tables.push({
          page: Math.floor(i / 5) + 1,
          rows: rows.length,
          cols: maxCols,
          content: rowTexts.join('\n')
        });
      }
    }
    
    const mediaFiles = zip.getEntries().filter(e => e.entryName.startsWith('word/media/'));
    const imageCount = mediaFiles.length;
    const images = mediaFiles.slice(0, 20).map((f, i) => ({
      page: Math.floor(i / 3) + 1,
      description: f.name
    }));

    let text = xmlContent;
    text = text.replace(/<w:br[^>]*\/?>/g, '\n');
    text = text.replace(/<w:p[^>]*>/g, '\n');
    text = text.replace(/<\/w:p>/g, '\n');
    
    text = text.replace(/<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/g, (tableXml) => {
      const rowMatches = tableXml.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g) || [];
      const tableLines: string[] = [];
      
      for (const rowXml of rowMatches) {
        const cells = rowXml.match(/<w:tc[^>]*>[\s\S]*?<\/w:tc>/g) || [];
        const cellTexts = cells.map(cell => {
          let cellText = cell.replace(/<[^>]+>/g, '').trim();
          return cellText;
        });
        tableLines.push('| ' + cellTexts.join(' | ') + ' |');
      }
      
      return '\n\n【表格】\n' + tableLines.join('\n') + '\n\n';
    });
    
    text = text.replace(/<w:tr[^>]*>/g, '\n');
    text = text.replace(/<\/w:tr>/g, '\n');
    text = text.replace(/<w:tc[^>]*>/g, '\t');
    text = text.replace(/<\/w:tc>/g, '\t');
    text = text.replace(/<w:t>/g, '');
    text = text.replace(/<\/w:t>/g, '');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

    const cleanedContent = cleanText(text);
    
    const headingPattern = /^(第[一二三四五六七八九十百千]+[章节篇讲]|[\d]+\.[\d\s.]*[\u4e00-\u9fa5\w]+|[\u4e00-\u9fa5]{2,20}[:：]?$)/gm;
    const sections = cleanedContent.match(headingPattern)?.slice(0, 50) || [];
    
    return {
      content: cleanedContent,
      metadata: {
        tableCount: tables.length,
        imageCount,
        tables,
        images,
        sections: sections.filter(s => s.length > 2 && s.length < 50).slice(0, 30),
      }
    };
  } catch (e) {
    console.warn('[RAG] DOCX parse error:', e);
    return { content: '', metadata: {} };
  }
}

function cleanText(text: string): string {
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  text = text.replace(/\n{4,}/g, '\n\n');
  text = text.replace(/\n{3}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n[ \t]+/g, '\n');
  return text.trim();
}

export async function parseDocument(filePath: string, fileName: string): Promise<ParseResult> {
  const ext = fileName.toLowerCase().split('.').pop() as FileType;

  switch (ext) {
    case 'pdf':
      return await parsePDF(filePath);
    case 'txt':
      return parseTXT(filePath);
    case 'md':
      return parseMD(filePath);
    case 'docx':
      return await parseDOCX(filePath);
    default:
      throw new Error(`不支持的文件类型: ${ext}`);
  }
}

export function chunkByToken(content: string, chunkSize: number = 500, chunkOverlap: number = 50): string[] {
  if (!content.trim()) return [];

  const enc = getTokenizer();
  const tokens = enc.encode(content);
  const chunks: string[] = [];

  if (tokens.length <= chunkSize) {
    chunks.push(content);
    return chunks;
  }

  const step = chunkSize - chunkOverlap;
  if (step <= 0) {
    throw new Error('chunkSize must be greater than chunkOverlap');
  }

  for (let i = 0; i < tokens.length; i += step) {
    const chunkTokens = tokens.slice(i, i + chunkSize);
    const decoded = enc.decode(chunkTokens);
    const chunkText = typeof decoded === 'string' ? decoded : new TextDecoder().decode(decoded as Uint8Array);
    const trimmed = chunkText.trim();
    if (trimmed) {
      chunks.push(trimmed);
    }
  }

  return chunks;
}

export function simulateEmbedding(text: string): number[] {
  const dimension = 384;
  const embedding: number[] = new Array(dimension).fill(0);

  const normalizedText = text.trim().toLowerCase();

  for (let i = 0; i < normalizedText.length; i++) {
    const charCode = normalizedText.charCodeAt(i);
    const position = i % dimension;
    const value = (charCode * (i + 1)) / 65535;
    embedding[position] += value;
    embedding[(position + 7) % dimension] += value * 0.5;
    embedding[(position + 13) % dimension] += value * 0.3;
  }

  const words = normalizedText.split(/[\s\n，。！？、；：""''（）【】《》]+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let wordHash = 0;
    for (let j = 0; j < word.length; j++) {
      wordHash = ((wordHash << 5) - wordHash) + word.charCodeAt(j);
      wordHash |= 0;
    }
    const absHash = Math.abs(wordHash);
    const pos1 = absHash % dimension;
    const pos2 = (absHash * 7) % dimension;
    const pos3 = (absHash * 13) % dimension;
    const weight = 1 / (i + 1);
    embedding[pos1] += weight * 2;
    embedding[pos2] += weight * 1.5;
    embedding[pos3] += weight;
  }

  const norm = Math.sqrt(embedding.reduce((a, b) => a + b * b, 0));
  if (norm > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= norm;
    }
  }

  return embedding;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return simulateEmbedding(text);
}

export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  const len = Math.min(vec1.length, vec2.length);

  for (let i = 0; i < len; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

function keywordMatchScore(content: string, query: string): number {
  const contentLower = content.toLowerCase();
  const queryLower = query.toLowerCase();

  const queryWords = queryLower.split(/[\s\n，。！？、；：""''（）【】《》]+/).filter(Boolean);
  if (queryWords.length === 0) return 0;

  let score = 0;
  let matchedWords = 0;

  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      matchedWords++;
      const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = contentLower.match(regex);
      const count = matches ? matches.length : 0;
      score += count * (1 / queryWords.length);
    }
  }

  const matchRatio = matchedWords / queryWords.length;
  return score * matchRatio;
}

export async function recall(options: SearchOptions): Promise<SearchResult[]> {
  const {
    query,
    topK = 5,
    useRerank = true,
    searchStrategy = 'hybrid',
    documentIds,
  } = options;

  if (!query.trim()) return [];

  const queryEmbedding = await generateEmbedding(query);

  let allChunks: RagChunk[];
  if (documentIds && documentIds.length > 0) {
    allChunks = [];
    for (const docId of documentIds) {
      const docChunks = RagChunkDAO.findByDocumentId(docId);
      allChunks.push(...docChunks);
    }
  } else {
    allChunks = RagChunkDAO.findAllChunks();
  }

  const vectorResults: SearchResult[] = [];

  for (const chunk of allChunks) {
    const embedding = parseJSON<number[]>(chunk.embedding);
    if (!embedding) continue;

    const similarity = cosineSimilarity(queryEmbedding, embedding);
    const keywordScore = keywordMatchScore(chunk.content, query);

    let score: number;
    if (searchStrategy === 'vector') {
      score = similarity;
    } else {
      score = similarity * 0.6 + Math.min(keywordScore, 1) * 0.4;
    }

    vectorResults.push({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      score,
      similarity,
      metadata: parseJSON<Record<string, any>>(chunk.metadata) || undefined,
    });
  }

  vectorResults.sort((a, b) => b.score - a.score);

  let results = vectorResults.slice(0, topK * 2);

  if (useRerank) {
    results = rerank(results, query);
  }

  results = results.slice(0, topK);

  const docMap = new Map<string, RagDocument | undefined>();
  for (const result of results) {
    if (!docMap.has(result.documentId)) {
      const doc = RagDocumentDAO.findById(result.documentId);
      docMap.set(result.documentId, doc);
    }
    const doc = docMap.get(result.documentId);
    if (doc) {
      result.document = {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        fileType: doc.fileType,
        category: doc.category,
      };
    }
  }

  return results;
}

export function rerank(results: SearchResult[], query: string): SearchResult[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/[\s\n，。！？、；：""''（）【】《》]+/).filter(Boolean);

  const reranked = results.map((result, index) => {
    let rerankScore = result.score * 0.5;

    const contentLower = result.content.toLowerCase();

    if (contentLower.includes(queryLower)) {
      rerankScore += 0.3;
    }

    const firstSentence = contentLower.split(/[。！？\n]/)[0] || '';
    if (queryWords.some(word => firstSentence.includes(word))) {
      rerankScore += 0.1;
    }

    let matchCount = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        matchCount++;
      }
    }
    if (queryWords.length > 0) {
      rerankScore += (matchCount / queryWords.length) * 0.1;
    }

    return {
      ...result,
      score: rerankScore,
    };
  });

  reranked.sort((a, b) => b.score - a.score);

  return reranked;
}

export function buildContext(results: SearchResult[], maxTokens: number = 3000): string {
  if (results.length === 0) return '';

  let context = '## 知识库相关信息\n\n';
  let currentTokens = countTokens(context);

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const sourceName = result.document?.title || result.document?.fileName || '未知文档';

    const chunkText = `### 参考资料 ${i + 1}（来源：${sourceName}）\n${result.content}\n\n`;
    const chunkTokens = countTokens(chunkText);

    if (currentTokens + chunkTokens > maxTokens && i > 0) {
      break;
    }

    context += chunkText;
    currentTokens += chunkTokens;
  }

  return context;
}

export async function processDocument(
  documentId: string,
  filePath: string,
  config: ChunkConfig
): Promise<void> {
  try {
    RagDocumentDAO.updateStatus(documentId, 'processing');

    const doc = RagDocumentDAO.findById(documentId);
    if (!doc) {
      throw new Error('文档不存在');
    }

    const parseResult = await parseDocument(filePath, doc.fileName || '');
    const content = parseResult.content;

    if (!content.trim()) {
      RagDocumentDAO.updateStatus(documentId, 'failed');
      return;
    }

    RagChunkDAO.deleteByDocumentId(documentId);

    let chunks: string[];
    switch (config.strategy) {
      case 'fixed_size':
      case 'semantic':
      case 'recursive':
      default:
        chunks = chunkByToken(content, config.chunkSize, config.chunkOverlap);
        break;
    }

    const pageCount = parseResult.metadata.pageCount || Math.ceil(chunks.length / 3);

    for (let i = 0; i < chunks.length; i++) {
      const chunkContent = chunks[i];
      const tokenCount = countTokens(chunkContent);
      const embedding = await generateEmbedding(chunkContent);

      const metadata = {
        chunkIndex: i,
        totalChunks: chunks.length,
        charLength: chunkContent.length,
        page: Math.floor(i / Math.max(1, Math.ceil(chunks.length / pageCount))) + 1,
        section: parseResult.metadata.sections?.[Math.floor(i / Math.max(1, Math.ceil(chunks.length / (parseResult.metadata.sections?.length || 1))))] || `第${i + 1}节`,
        ...parseResult.metadata,
      };

      RagChunkDAO.create({
        documentId,
        chunkIndex: i,
        content: chunkContent,
        tokenCount,
        embedding: stringifyJSON(embedding) ?? undefined,
        metadata: stringifyJSON(metadata) ?? undefined,
      });
    }

    RagDocumentDAO.updateStatus(documentId, 'ready', chunks.length);

    console.log(`[RAG] 文档处理完成: ${documentId}, 共 ${chunks.length} 个分片`);
  } catch (error) {
    console.error('[RAG] 文档处理失败:', error);
    RagDocumentDAO.updateStatus(documentId, 'failed');
  }
}

export async function rechunkDocument(
  documentId: string,
  filePath: string,
  config: ChunkConfig
): Promise<{ totalChunks: number }> {
  const doc = RagDocumentDAO.findById(documentId);
  if (!doc) {
    throw new Error('文档不存在');
  }

  RagDocumentDAO.update(documentId, {
    chunkStrategy: config.strategy,
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    status: 'processing',
  });

  const parseResult = await parseDocument(filePath, doc.fileName || '');
  const content = parseResult.content;

  if (!content.trim()) {
    RagDocumentDAO.updateStatus(documentId, 'failed');
    throw new Error('文档内容为空');
  }

  RagChunkDAO.deleteByDocumentId(documentId);

  const chunks = chunkByToken(content, config.chunkSize, config.chunkOverlap);
  
  const pageCount = parseResult.metadata.pageCount || Math.ceil(chunks.length / 3);

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    const tokenCount = countTokens(chunkContent);
    const embedding = await generateEmbedding(chunkContent);

    const metadata = {
      chunkIndex: i,
      totalChunks: chunks.length,
      charLength: chunkContent.length,
      page: Math.floor(i / Math.max(1, Math.ceil(chunks.length / pageCount))) + 1,
      section: parseResult.metadata.sections?.[Math.floor(i / Math.max(1, Math.ceil(chunks.length / (parseResult.metadata.sections?.length || 1))))] || `第${i + 1}节`,
      ...parseResult.metadata,
    };

    RagChunkDAO.create({
      documentId,
      chunkIndex: i,
      content: chunkContent,
      tokenCount,
      embedding: stringifyJSON(embedding) ?? undefined,
      metadata: stringifyJSON(metadata) ?? undefined,
    });
  }

  RagDocumentDAO.updateStatus(documentId, 'ready', chunks.length);

  return { totalChunks: chunks.length };
}
