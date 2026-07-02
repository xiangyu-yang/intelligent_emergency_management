import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const SKILLS_DIR = path.join(process.cwd(), 'data', 'skills');

export interface ToolExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
}

export interface ToolPermission {
  type: 'file_read' | 'file_write' | 'script_exec' | 'network';
  path?: string;
  description: string;
}

export async function executeSkillScript(
  skillId: string,
  scriptName: string,
  args: string[] = []
): Promise<ToolExecutionResult> {
  return new Promise((resolve) => {
    const skillDir = path.join(SKILLS_DIR, skillId);
    const scriptPath = path.join(skillDir, 'scripts', scriptName);

    if (!fs.existsSync(scriptPath)) {
      resolve({ success: false, error: `脚本不存在: ${scriptPath}` });
      return;
    }

    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const fullArgs = [scriptPath, ...args];

    let output = '';
    let error = '';

    const child = spawn(pythonPath, fullArgs, {
      cwd: skillDir,
      timeout: 300000,
    });

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({ success: false, error: error || `脚本执行失败，退出码: ${code}` });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, error: `执行错误: ${err.message}` });
    });
  });
}

export async function readSkillFile(skillId: string, filePath: string): Promise<ToolExecutionResult> {
  try {
    const skillDir = path.join(SKILLS_DIR, skillId);
    const fullPath = path.join(skillDir, filePath);

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: `文件不存在: ${filePath}` };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    return { success: true, output: content };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function getSkillPermissions(skillId: string): ToolPermission[] {
  const permissions: ToolPermission[] = [
    {
      type: 'file_read',
      path: `data/skills/${skillId}/reference/`,
      description: '读取技能参考文档',
    },
    {
      type: 'file_read',
      path: `data/skills/${skillId}/assets/`,
      description: '读取技能静态资源文件',
    },
    {
      type: 'script_exec',
      path: `data/skills/${skillId}/scripts/`,
      description: '执行技能脚本',
    },
    {
      type: 'network',
      description: '访问互联网获取政策文件',
    },
  ];

  return permissions;
}

export async function executeCommand(command: string, cwd?: string): Promise<ToolExecutionResult> {
  return new Promise((resolve) => {
    exec(command, { cwd, timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
}