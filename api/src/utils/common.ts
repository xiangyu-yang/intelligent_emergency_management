import { nanoid } from 'nanoid';
import dayjs from 'dayjs';

export function generateId(length: number = 12): string {
  return nanoid(length);
}

export function now(): string {
  return dayjs().toISOString();
}

export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(format);
}

export function parseJSON<T = any>(str: string | null | undefined, defaultValue: T | null = null): T | null {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str) as T;
  } catch {
    return defaultValue;
  }
}

export function stringifyJSON(obj: any): string | null {
  if (obj === undefined || obj === null) return null;
  try {
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}

export function paginate<T>(items: T[], page: number = 1, pageSize: number = 10): {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const list = items.slice(start, start + pageSize);
  return { list, total, page, pageSize, totalPages };
}

export function successResponse<T = any>(data: T, message: string = 'success'): ApiResponse<T> {
  return { code: 0, message, data };
}

export function errorResponse(message: string, code: number = 1, data: any = null): ApiResponse<any> {
  return { code, message, data };
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 11) return phone || '';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const [name, domain] = email.split('@');
  const maskedName = name.length > 2 ? name[0] + '*'.repeat(name.length - 2) + name[name.length - 1] : '*'.repeat(name.length);
  return `${maskedName}@${domain}`;
}

export function getLevelColor(level: string): string {
  const colorMap: Record<string, string> = {
    'critical': '#dc2626',
    'high': '#ea580c',
    'medium': '#ca8a04',
    'low': '#16a34a',
    'info': '#2563eb',
  };
  return colorMap[level] || '#6b7280';
}

export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'detected': '已发现',
    'verified': '已核实',
    'responding': '响应中',
    'resolving': '处置中',
    'resolved': '已解决',
    'closed': '已关闭',
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'cancelled': '已取消',
    'active': '启用',
    'inactive': '停用',
    'available': '可用',
    'unavailable': '不可用',
  };
  return statusMap[status] || status;
}

export function getLevelText(level: string): string {
  const levelMap: Record<string, string> = {
    'critical': '特别重大',
    'high': '重大',
    'medium': '较大',
    'low': '一般',
  };
  return levelMap[level] || level;
}

export function calculateDuration(startAt: string, endAt?: string): string {
  const start = dayjs(startAt);
  const end = endAt ? dayjs(endAt) : dayjs();
  const diffMinutes = end.diff(start, 'minute');

  if (diffMinutes < 60) {
    return `${diffMinutes}分钟`;
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    const hours = Math.floor((diffMinutes % 1440) / 60);
    return `${days}天${hours > 0 ? hours + '小时' : ''}`;
  }
}

export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

export function unescapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, entity => htmlEntities[entity] || entity);
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn(...args);
    }
  };
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
}
