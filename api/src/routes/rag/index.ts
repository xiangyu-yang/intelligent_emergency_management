import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { RagDocumentDAO, RagChunkDAO } from '../../db/dao.js';
import {
  processDocument,
  rechunkDocument,
  recall,
  buildContext,
  type ChunkStrategy,
  type SearchStrategy,
} from '../../ai/rag.js';
import { successResponse, errorResponse, parseJSON } from '../../utils/common.js';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'rag');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function fixFilenameEncoding(filename: string): string {
  try {
    const fixed = Buffer.from(filename, 'latin1').toString('utf8');
    if (fixed.includes('\u0000')) {
      return filename;
    }
    return fixed;
  } catch {
    return filename;
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = fixFilenameEncoding(file.originalname)
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\.\./g, '');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.xlsx', '.xls'];

    const fileName = fixFilenameEncoding(file.originalname);
    const lowerName = fileName.toLowerCase();

    if (allowedTypes.includes(file.mimetype) ||
        allowedExtensions.some(ext => lowerName.endsWith(ext))) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PDF、Word、TXT、MD、Excel 文件'));
    }
  },
});

const uploadSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  chunkStrategy: z.enum(['fixed_size', 'hierarchical', 'semantic']).optional().default('fixed_size'),
  chunkSize: z.coerce.number().min(50).max(5000).optional().default(500),
  chunkOverlap: z.coerce.number().min(0).max(1000).optional().default(50),
  createdBy: z.string().optional(),
});

const documentQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(100).optional().default(10),
  category: z.string().optional(),
  status: z.string().optional(),
  keyword: z.string().optional(),
});

const rechunkSchema = z.object({
  chunkStrategy: z.enum(['fixed_size', 'hierarchical', 'semantic']).optional().default('fixed_size'),
  chunkSize: z.number().min(50).max(5000).optional().default(500),
  chunkOverlap: z.number().min(0).max(1000).optional().default(50),
});

const searchSchema = z.object({
  query: z.string().min(1, '查询内容不能为空'),
  topK: z.number().min(1).max(50).optional().default(5),
  useRerank: z.boolean().optional().default(true),
  searchStrategy: z.enum(['vector', 'hybrid']).optional().default('hybrid'),
  documentIds: z.array(z.string()).optional(),
});

const contextSchema = z.object({
  query: z.string().min(1, '查询内容不能为空'),
  topK: z.number().min(1).max(50).optional().default(5),
  maxTokens: z.number().min(100).max(10000).optional().default(3000),
  useRerank: z.boolean().optional().default(true),
  searchStrategy: z.enum(['vector', 'hybrid']).optional().default('hybrid'),
});

const chunkQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  pageSize: z.coerce.number().min(1).max(200).optional().default(20),
});

function parseTags(tagsStr: string | undefined): string[] {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
}

function formatDocument(doc: any) {
  return {
    ...doc,
    tags: parseTags(doc.tags),
  };
}

function formatChunk(chunk: any) {
  return {
    ...chunk,
    metadata: parseJSON(chunk.metadata),
  };
}

router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.json(errorResponse('请选择文件', 400));
      return;
    }

    const validated = uploadSchema.parse(req.body);
    const originalFileName = fixFilenameEncoding(file.originalname);

    const title = validated.title || originalFileName.replace(/\.[^/.]+$/, '');
    const ext = originalFileName.toLowerCase().split('.').pop() || '';
    const fileUrl = `/uploads/rag/${file.filename}`;

    const created = RagDocumentDAO.create({
      title,
      fileName: originalFileName,
      fileType: ext,
      fileSize: file.size,
      fileUrl,
      category: validated.category,
      tags: validated.tags,
      chunkStrategy: validated.chunkStrategy,
      chunkSize: validated.chunkSize,
      chunkOverlap: validated.chunkOverlap,
      totalChunks: 0,
      status: 'uploading',
      createdBy: validated.createdBy,
    });

    const filePath = path.join(uploadDir, file.filename);

    Promise.resolve().then(() => {
      return processDocument(created.id, filePath, {
        strategy: validated.chunkStrategy as ChunkStrategy,
        chunkSize: validated.chunkSize,
        chunkOverlap: validated.chunkOverlap,
      });
    }).catch(err => {
      console.error('[RAG] 异步处理失败:', err);
    });

    res.json(successResponse(formatDocument(created), '文档上传成功，正在处理中'));
  } catch (err: any) {
    if (req.file) {
      try {
        fs.unlinkSync(path.join(uploadDir, req.file.filename));
      } catch {
        // ignore
      }
    }
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '上传失败', 500));
    }
  }
});

router.get('/documents', (req: Request, res: Response) => {
  try {
    const validated = documentQuerySchema.parse(req.query);
    const { page, pageSize, category, status, keyword } = validated;

    let allDocuments = RagDocumentDAO.findAll({
      orderBy: 'createdAt',
      order: 'DESC',
    });

    if (category) {
      allDocuments = allDocuments.filter(item => item.category === category);
    }

    if (status) {
      allDocuments = allDocuments.filter(item => item.status === status);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      allDocuments = allDocuments.filter(item => {
        const title = (item.title || '').toLowerCase();
        const fileName = (item.fileName || '').toLowerCase();
        const categoryStr = (item.category || '').toLowerCase();
        const tagsStr = (item.tags || '').toLowerCase();
        return title.includes(kw) || fileName.includes(kw) || categoryStr.includes(kw) || tagsStr.includes(kw);
      });
    }

    const total = allDocuments.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const list = allDocuments.slice(start, start + pageSize).map(formatDocument);

    const categories = [...new Set(allDocuments.map(item => item.category).filter(Boolean))];

    res.json(successResponse({
      list,
      total,
      page,
      pageSize,
      totalPages,
      categories,
    }, '获取文档列表成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '获取文档列表失败', 500));
    }
  }
});

router.get('/documents/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document = RagDocumentDAO.findById(id);

    if (!document) {
      res.json(errorResponse('文档不存在', 404));
      return;
    }

    const chunks = RagChunkDAO.findByDocumentId(id);

    res.json(successResponse({
      ...formatDocument(document),
      chunkCount: chunks.length,
    }, '获取文档详情成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取文档详情失败', 500));
  }
});

router.delete('/documents/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const document = RagDocumentDAO.findById(id);
    if (!document) {
      res.json(errorResponse('文档不存在', 404));
      return;
    }

    if (document.fileUrl) {
      const filePath = path.join(process.cwd(), document.fileUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore
        }
      }
    }

    RagChunkDAO.deleteByDocumentId(id);
    const deleted = RagDocumentDAO.delete(id);

    res.json(successResponse({ deleted }, '删除文档成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '删除文档失败', 500));
  }
});

router.post('/documents/:id/rechunk', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = rechunkSchema.parse(req.body);

    const document = RagDocumentDAO.findById(id);
    if (!document) {
      res.json(errorResponse('文档不存在', 404));
      return;
    }

    if (!document.fileUrl) {
      res.json(errorResponse('文档文件不存在', 400));
      return;
    }

    const filePath = path.join(process.cwd(), document.fileUrl);
    if (!fs.existsSync(filePath)) {
      res.json(errorResponse('文档文件不存在', 400));
      return;
    }

    const result = await rechunkDocument(id, filePath, {
      strategy: validated.chunkStrategy as ChunkStrategy,
      chunkSize: validated.chunkSize,
      chunkOverlap: validated.chunkOverlap,
    });

    const updatedDoc = RagDocumentDAO.findById(id);

    res.json(successResponse({
      document: formatDocument(updatedDoc),
      totalChunks: result.totalChunks,
    }, '重新分片成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '重新分片失败', 500));
    }
  }
});

router.get('/documents/:id/chunks', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = chunkQuerySchema.parse(req.query);
    const { page, pageSize } = validated;

    const document = RagDocumentDAO.findById(id);
    if (!document) {
      res.json(errorResponse('文档不存在', 404));
      return;
    }

    const allChunks = RagChunkDAO.findByDocumentId(id);
    const total = allChunks.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const list = allChunks.slice(start, start + pageSize).map(formatChunk);

    res.json(successResponse({
      list,
      total,
      page,
      pageSize,
      totalPages,
      document: formatDocument(document),
    }, '获取分片列表成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '获取分片列表失败', 500));
    }
  }
});

router.post('/search', async (req: Request, res: Response) => {
  try {
    const validated = searchSchema.parse(req.body);
    const { query, topK, useRerank, searchStrategy, documentIds } = validated;

    const results = await recall({
      query,
      topK,
      useRerank,
      searchStrategy: searchStrategy as SearchStrategy,
      documentIds,
    });

    res.json(successResponse({
      results,
      total: results.length,
    }, '搜索成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '搜索失败', 500));
    }
  }
});

router.post('/context', async (req: Request, res: Response) => {
  try {
    const validated = contextSchema.parse(req.body);
    const { query, topK, maxTokens, useRerank, searchStrategy } = validated;

    const results = await recall({
      query,
      topK,
      useRerank,
      searchStrategy: searchStrategy as SearchStrategy,
    });

    const context = buildContext(results, maxTokens);

    res.json(successResponse({
      context,
      hasContext: context.length > 0,
      chunks: results,
      totalChunks: results.length,
    }, '获取上下文成功'));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.json(errorResponse(err.errors[0].message, 400));
    } else {
      res.json(errorResponse(err.message || '获取上下文失败', 500));
    }
  }
});

const KKFIVIEW_URL = process.env.KKFILEVIEW_URL || 'http://localhost:8012';

async function checkKKFileView(): Promise<boolean> {
  try {
    const response = await fetch(`${KKFIVIEW_URL}`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch (e) {
    return false;
  }
}

async function getHostIP(): Promise<string> {
  const { exec } = await import('child_process');
  return new Promise((resolve) => {
    exec("ifconfig | grep 'inet ' | grep -v 127.0.0.1 | grep -v '::1' | head -1 | awk '{print $2}'", (err: any, stdout: string) => {
      if (!err && stdout.trim()) {
        resolve(stdout.trim());
      } else {
        exec("ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '127.0.0.1'", (err2: any, stdout2: string) => {
          resolve(err2 ? '127.0.0.1' : stdout2.trim() || '127.0.0.1');
        });
      }
    });
  });
}

async function checkDockerRunning(): Promise<boolean> {
  try {
    const { exec } = await import('child_process');
    return new Promise((resolve) => {
      exec('docker info', { timeout: 5000 }, (err: any) => {
        resolve(!err);
      });
    });
  } catch {
    return false;
  }
}

async function startDockerService(): Promise<boolean> {
  try {
    const { exec, spawn } = await import('child_process');
    return new Promise((resolve) => {
      exec('open -a Docker', (err: any) => {
        if (!err) {
          let waited = 0;
          const interval = setInterval(async () => {
            waited += 1000;
            if (waited > 60000) {
              clearInterval(interval);
              resolve(false);
              return;
            }
            const running = await checkDockerRunning();
            if (running) {
              clearInterval(interval);
              resolve(true);
            }
          }, 1000);
        } else {
          resolve(false);
        }
      });
    });
  } catch {
    return false;
  }
}

async function startKKFileView(): Promise<boolean> {
  try {
    const dockerRunning = await checkDockerRunning();
    if (!dockerRunning) {
      console.log('[KKFileView] Docker服务未运行，尝试启动...');
      const started = await startDockerService();
      if (!started) {
        console.warn('[KKFileView] Docker启动失败');
        return false;
      }
      console.log('[KKFileView] Docker服务已启动');
    }
    
    const { exec } = await import('child_process');
    const hostIP = await getHostIP();
    
    return new Promise((resolve) => {
      exec('docker ps --filter "name=kkfileview" --format "{{.Names}}"', (err, stdout) => {
        if (stdout.trim() === 'kkfileview') {
          exec('docker start kkfileview', (startErr) => {
            if (!startErr) {
              setTimeout(async () => {
                const isRunning = await checkKKFileView();
                resolve(isRunning);
              }, 5000);
            } else {
              resolve(false);
            }
          });
        } else {
          exec('docker rm -f kkfileview 2>/dev/null', () => {
            const cmd = `docker run -d --name kkfileview --add-host=host.docker.internal:${hostIP} -e KK_TRUST_HOST= -p 8012:8012 keking/kkfileview:latest`;
            exec(cmd, (runErr) => {
              if (!runErr) {
                setTimeout(async () => {
                  const isRunning = await checkKKFileView();
                  resolve(isRunning);
                }, 10000);
              } else {
                console.warn('[KKFileView] Docker启动kkfileview失败:', runErr);
                resolve(false);
              }
            });
          });
        }
      });
    });
  } catch (e) {
    console.warn('[KKFileView] 启动失败:', e);
    return false;
  }
}

router.get('/preview/status', async (_req: Request, res: Response) => {
  try {
    const dockerRunning = await checkDockerRunning();
    const isRunning = dockerRunning ? await checkKKFileView() : false;
    res.json(successResponse({
      dockerRunning,
      running: isRunning,
      url: KKFIVIEW_URL,
    }, '获取预览服务状态成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取状态失败', 500));
  }
});

router.post('/docker/start', async (_req: Request, res: Response) => {
  try {
    const dockerRunning = await checkDockerRunning();
    if (dockerRunning) {
      res.json(successResponse({ running: true }, 'Docker已在运行'));
      return;
    }
    
    const started = await startDockerService();
    res.json(successResponse({
      running: started,
    }, started ? 'Docker启动成功' : 'Docker启动失败，请手动启动Docker Desktop'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '启动失败', 500));
  }
});

router.post('/preview/start', async (_req: Request, res: Response) => {
  try {
    const dockerRunning = await checkDockerRunning();
    if (!dockerRunning) {
      res.json(successResponse({ running: false, dockerRunning: false }, 'Docker未运行，请先启动Docker'));
      return;
    }
    
    const isRunning = await checkKKFileView();
    if (isRunning) {
      res.json(successResponse({ running: true, dockerRunning: true }, '预览服务已在运行'));
      return;
    }
    
    const started = await startKKFileView();
    res.json(successResponse({
      running: started,
      dockerRunning: true,
    }, started ? '预览服务启动成功' : '预览服务启动失败'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '启动失败', 500));
  }
});

router.get('/preview/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document = RagDocumentDAO.findById(id);
    
    if (!document) {
      res.json(errorResponse('文档不存在', 404));
      return;
    }
    
    if (!document.fileUrl) {
      res.json(errorResponse('文档文件不存在', 400));
      return;
    }
    
    const isRunning = await checkKKFileView();
    
    const serverHost = process.env.SERVER_HOST || await getHostIP();
    const serverPort = process.env.SERVER_PORT || '4001';
    const fileUrl = `http://${serverHost}:${serverPort}${document.fileUrl}`;
    const base64FileUrl = Buffer.from(fileUrl).toString('base64');
    
    const previewUrl = isRunning 
      ? `${KKFIVIEW_URL}/onlinePreview?url=${encodeURIComponent(base64FileUrl)}`
      : null;
    
    res.json(successResponse({
      running: isRunning,
      previewUrl,
      fileUrl,
      kkfileviewUrl: KKFIVIEW_URL,
      document: {
        id: document.id,
        title: document.title,
        fileName: document.fileName,
        fileType: document.fileType,
      }
    }, '获取预览地址成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取预览地址失败', 500));
  }
});

export default router;
