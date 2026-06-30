import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { successResponse, errorResponse } from '../../utils/common.js';

const router = Router();

const SKILLS_DIR = path.join(process.cwd(), 'data', 'skills');

interface SkillMetadata {
  name: string;
  description: string;
  id: string;
  version: string;
  category: string;
  difficulty: string;
  tags: string[];
}

interface SkillResource {
  name: string;
  type: 'directory' | 'file';
  children?: SkillResource[];
}

interface SkillDetail {
  id: string;
  metadata: SkillMetadata | null;
  instruction: string;
  resource: SkillResource;
  rawContent: string;
}

function parseSkillMetadata(markdown: string): SkillMetadata | null {
  const metadataMatch = markdown.match(/##\s*metadata\s*\n```json\s*([\s\S]*?)\s*```/);
  if (metadataMatch) {
    try {
      return JSON.parse(metadataMatch[1]);
    } catch {
      return null;
    }
  }
  return null;
}

function extractInstruction(markdown: string): string {
  const instructionMatch = markdown.match(/##\s*instruction\s*\n([\s\S]*?)(?=\n##\s*resource|$)/);
  return instructionMatch ? instructionMatch[1].trim() : '';
}

function buildResourceTree(dirPath: string, baseDir: string): SkillResource {
  const name = path.basename(dirPath);
  const stat = fs.statSync(dirPath);

  if (stat.isFile()) {
    return {
      name,
      type: 'file',
    };
  }

  const children = fs.readdirSync(dirPath)
    .filter(file => file !== '.DS_Store')
    .map(file => {
      const childPath = path.join(dirPath, file);
      return buildResourceTree(childPath, baseDir);
    });

  return {
    name,
    type: 'directory',
    children,
  };
}

router.get('/', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(SKILLS_DIR)) {
      res.json(successResponse([], '技能列表为空'));
      return;
    }

    const skillIds = fs.readdirSync(SKILLS_DIR)
      .filter(item => {
        const itemPath = path.join(SKILLS_DIR, item);
        return fs.statSync(itemPath).isDirectory();
      });

    const skills = skillIds.map(id => {
      const skillDir = path.join(SKILLS_DIR, id);
      const skillMdPath = path.join(skillDir, 'skill.md');

      if (!fs.existsSync(skillMdPath)) {
        return {
          id,
          name: id,
          description: '',
          version: '1.0.0',
          category: '未分类',
          difficulty: 'medium',
          tags: [],
        };
      }

      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const metadata = parseSkillMetadata(content);

      return {
        id,
        name: metadata?.name || id,
        description: metadata?.description || '',
        version: metadata?.version || '1.0.0',
        category: metadata?.category || '未分类',
        difficulty: metadata?.difficulty || 'medium',
        tags: metadata?.tags || [],
      };
    });

    res.json(successResponse(skills, '获取技能列表成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取技能列表失败', 500));
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const skillDir = path.join(SKILLS_DIR, id);
    const skillMdPath = path.join(skillDir, 'skill.md');

    if (!fs.existsSync(skillDir)) {
      res.json(errorResponse('技能不存在', 404));
      return;
    }

    if (!fs.existsSync(skillMdPath)) {
      res.json(errorResponse('技能描述文件不存在', 404));
      return;
    }

    const rawContent = fs.readFileSync(skillMdPath, 'utf-8');
    const metadata = parseSkillMetadata(rawContent);
    const instruction = extractInstruction(rawContent);

    const resourceDir = path.join(skillDir, 'reference');
    const resourceTree: SkillResource = {
      name: id,
      type: 'directory',
      children: [],
    };

    ['reference', 'scripts', 'assets'].forEach(dirName => {
      const dirPath = path.join(skillDir, dirName);
      if (fs.existsSync(dirPath)) {
        resourceTree.children?.push(buildResourceTree(dirPath, skillDir));
      }
    });

    const skillDetail: SkillDetail = {
      id,
      metadata,
      instruction,
      resource: resourceTree,
      rawContent,
    };

    res.json(successResponse(skillDetail, '获取技能详情成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取技能详情失败', 500));
  }
});

router.get('/:id/raw', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const skillMdPath = path.join(SKILLS_DIR, id, 'skill.md');

    if (!fs.existsSync(skillMdPath)) {
      res.json(errorResponse('技能文件不存在', 404));
      return;
    }

    const content = fs.readFileSync(skillMdPath, 'utf-8');
    res.json(successResponse(content, '获取技能原始内容成功'));
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取技能原始内容失败', 500));
  }
});

router.get('/:id/resources/*', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resourcePath = req.params[0];
    const skillDir = path.join(SKILLS_DIR, id);

    if (!fs.existsSync(skillDir)) {
      res.json(errorResponse('技能不存在', 404));
      return;
    }

    const decodedPath = decodeURIComponent(resourcePath);
    const fullPath = path.join(skillDir, decodedPath);

    const resolvedPath = path.resolve(fullPath);
    const resolvedSkillDir = path.resolve(skillDir);

    if (!resolvedPath.startsWith(resolvedSkillDir)) {
      res.json(errorResponse('访问路径超出权限范围', 403));
      return;
    }

    if (!fs.existsSync(fullPath)) {
      res.json(errorResponse('文件不存在', 404));
      return;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const files = fs.readdirSync(fullPath).filter(file => file !== '.DS_Store');
      const fileList = files.map(file => {
        const filePath = path.join(fullPath, file);
        const fileStat = fs.statSync(filePath);
        return {
          name: file,
          type: fileStat.isDirectory() ? 'directory' : 'file',
          size: fileStat.isFile() ? fileStat.size : null,
          modifiedAt: fileStat.mtime,
        };
      });
      res.json(successResponse(fileList, '获取目录内容成功'));
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const textExtensions = ['.txt', '.md', '.py', '.json', '.js', '.ts', '.css', '.html'];

    if (textExtensions.includes(ext)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      res.json(successResponse({
        content,
        fileName: path.basename(fullPath),
        fileType: ext.slice(1),
        size: stat.size,
        modifiedAt: stat.mtime,
      }, '获取文件内容成功'));
    } else {
      const fileBuffer = fs.readFileSync(fullPath);
      res.setHeader('Content-Type', getContentType(ext));
      res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
      res.send(fileBuffer);
    }
  } catch (err: any) {
    res.json(errorResponse(err.message || '获取资源文件失败', 500));
  }
});

function getContentType(ext: string): string {
  const contentTypeMap: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.py': 'text/python',
    '.js': 'application/javascript',
    '.ts': 'text/typescript',
    '.css': 'text/css',
    '.html': 'text/html',
  };
  return contentTypeMap[ext] || 'application/octet-stream';
}

export default router;