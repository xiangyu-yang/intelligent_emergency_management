import { getDb } from './sqlite.js';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export class BaseDAO<T extends BaseEntity> {
  protected tableName: string;
  protected fields: string[];

  constructor(tableName: string, fields: string[]) {
    this.tableName = tableName;
    this.fields = fields;
  }

  protected get db() {
    return getDb();
  }

  protected now(): string {
    return dayjs().toISOString();
  }

  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): T {
    const id = nanoid(12);
    const createdAt = this.now();
    const insertData = { ...data, id, createdAt } as T;

    const fieldList = this.fields.filter(f => f in insertData);
    const placeholders = fieldList.map(() => '?').join(', ');
    const values = fieldList.map(f => (insertData as any)[f]);

    const sql = `INSERT INTO ${this.tableName} (${fieldList.join(', ')}) VALUES (${placeholders})`;
    this.db.prepare(sql).run(...values);

    return insertData;
  }

  findById(id: string): T | undefined {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id);
    return row as T | undefined;
  }

  findOne(options: QueryOptions = {}): T | undefined {
    const { where, orderBy, order = 'ASC' } = options;
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map(key => {
        params.push(where[key]);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy} ${order}`;
    }

    sql += ' LIMIT 1';

    const row = this.db.prepare(sql).get(...params);
    return row as T | undefined;
  }

  findAll(options: QueryOptions = {}): T[] {
    const { where, orderBy = 'createdAt', order = 'DESC', limit, offset } = options;
    let sql = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map(key => {
        params.push(where[key]);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY ${orderBy} ${order}`;

    if (limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    if (offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(offset);
    }

    const rows = this.db.prepare(sql).all(...params);
    return rows as T[];
  }

  count(where?: Record<string, any>): number {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];

    if (where && Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map(key => {
        params.push(where[key]);
        return `${key} = ?`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  update(id: string, data: Partial<Omit<T, 'id' | 'createdAt'>>): T | undefined {
    const updateData = { ...data, updatedAt: this.now() } as Partial<T>;
    const fields = Object.keys(updateData).filter(f => this.fields.includes(f));

    if (fields.length === 0) return this.findById(id);

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (updateData as any)[f]);
    values.push(id);

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  deleteBy(field: string, value: any): number {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${field} = ?`).run(value);
    return result.changes;
  }

  exists(id: string): boolean {
    const result = this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`).get(id);
    return !!result;
  }
}

export interface User extends BaseEntity {
  username: string;
  password: string;
  name: string;
  role: string;
  department?: string;
  phone?: string;
  email?: string;
}

export interface EmergencyEventType extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  level: string;
  category?: string;
  status: string;
}

export interface EmergencyPlanTemplate extends BaseEntity {
  name: string;
  eventTypeId?: string;
  description?: string;
  content?: string;
  version: string;
  status: string;
}

export interface EmergencySolutionTemplate extends BaseEntity {
  name: string;
  eventTypeId?: string;
  planTemplateId?: string;
  description?: string;
  content?: string;
  level: string;
  status: string;
}

export interface EmergencyOrganization extends BaseEntity {
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  role?: string;
  status: string;
}

export interface EmergencyResource extends BaseEntity {
  name: string;
  type?: string;
  category?: string;
  quantity: number;
  unit?: string;
  location?: string;
  manager?: string;
  phone?: string;
  status: string;
}

export interface EmergencyEvent extends BaseEntity {
  eventTypeId?: string;
  title: string;
  description?: string;
  location?: string;
  level: string;
  status: string;
  source?: string;
  detectedAt?: string;
  verifiedAt?: string;
  resolvedAt?: string;
  data?: string;
}

export interface EmergencyTask extends BaseEntity {
  eventId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  status: string;
  priority: string;
  deadline?: string;
  solutionData?: string;
  completedAt?: string;
}

export interface EmergencyKnowledge extends BaseEntity {
  title: string;
  category?: string;
  tags?: string;
  content?: string;
  source?: string;
  eventId?: string;
}

export interface EmergencySolution extends BaseEntity {
  eventId?: string;
  eventTypeId?: string;
  planTemplateId?: string;
  solutionTemplateId?: string;
  title: string;
  description?: string;
  content?: string;
  status: string;
  level?: string;
  version: string;
  createdBy?: string;
  approvedBy?: string;
  publishedAt?: string;
  archivedAt?: string;
}

export interface EventAnalysis extends BaseEntity {
  eventId: string;
  analysisType: string;
  result?: string;
}

const userFields = ['id', 'username', 'password', 'name', 'role', 'department', 'phone', 'email', 'createdAt', 'updatedAt'];
const eventTypeFields = ['id', 'name', 'code', 'description', 'level', 'category', 'status', 'createdAt', 'updatedAt'];
const planTemplateFields = ['id', 'name', 'eventTypeId', 'description', 'content', 'version', 'status', 'createdAt', 'updatedAt'];
const solutionTemplateFields = ['id', 'name', 'eventTypeId', 'planTemplateId', 'description', 'content', 'level', 'status', 'createdAt', 'updatedAt'];
const organizationFields = ['id', 'name', 'position', 'department', 'phone', 'email', 'role', 'status', 'createdAt', 'updatedAt'];
const resourceFields = ['id', 'name', 'type', 'category', 'quantity', 'unit', 'location', 'manager', 'phone', 'status', 'createdAt', 'updatedAt'];
const eventFields = ['id', 'eventTypeId', 'title', 'description', 'location', 'level', 'status', 'source', 'detectedAt', 'verifiedAt', 'resolvedAt', 'data', 'createdAt', 'updatedAt'];
const taskFields = ['id', 'eventId', 'title', 'description', 'assigneeId', 'assigneeName', 'status', 'priority', 'deadline', 'solutionData', 'completedAt', 'createdAt', 'updatedAt'];
const knowledgeFields = ['id', 'title', 'category', 'tags', 'content', 'source', 'eventId', 'createdAt', 'updatedAt'];
const solutionFields = ['id', 'eventId', 'eventTypeId', 'planTemplateId', 'solutionTemplateId', 'title', 'description', 'content', 'status', 'level', 'version', 'createdBy', 'approvedBy', 'publishedAt', 'archivedAt', 'createdAt', 'updatedAt'];
const analysisFields = ['id', 'eventId', 'analysisType', 'result', 'createdAt'];

export const UserDAO = new BaseDAO<User>('users', userFields);
export const EmergencyEventTypeDAO = new BaseDAO<EmergencyEventType>('emergency_event_types', eventTypeFields);
export const EmergencyPlanTemplateDAO = new BaseDAO<EmergencyPlanTemplate>('emergency_plan_templates', planTemplateFields);
export const EmergencySolutionTemplateDAO = new BaseDAO<EmergencySolutionTemplate>('emergency_solution_templates', solutionTemplateFields);
export const EmergencyOrganizationDAO = new BaseDAO<EmergencyOrganization>('emergency_organization', organizationFields);
export const EmergencyResourceDAO = new BaseDAO<EmergencyResource>('emergency_resources', resourceFields);
export const EmergencyEventDAO = new BaseDAO<EmergencyEvent>('emergency_events', eventFields);
export const EmergencyTaskDAO = new BaseDAO<EmergencyTask>('emergency_tasks', taskFields);
export const EmergencyKnowledgeDAO = new BaseDAO<EmergencyKnowledge>('emergency_knowledge', knowledgeFields);

class EmergencySolutionDAOImpl extends BaseDAO<EmergencySolution> {
  constructor() {
    super('emergency_solutions', solutionFields);
  }

  findByEventId(eventId: string): EmergencySolution[] {
    return this.findAll({
      where: { eventId },
      orderBy: 'createdAt',
      order: 'DESC',
    });
  }

  findByStatus(status: string): EmergencySolution[] {
    return this.findAll({
      where: { status },
      orderBy: 'createdAt',
      order: 'DESC',
    });
  }

  publish(id: string, approvedBy?: string): EmergencySolution | undefined {
    const solution = this.findById(id);
    if (!solution) return undefined;
    return this.update(id, {
      status: 'published',
      approvedBy,
      publishedAt: dayjs().toISOString(),
    });
  }

  archive(id: string): EmergencySolution | undefined {
    const solution = this.findById(id);
    if (!solution) return undefined;
    return this.update(id, {
      status: 'archived',
      archivedAt: dayjs().toISOString(),
    });
  }
}

export const EmergencySolutionDAO = new EmergencySolutionDAOImpl();

export const EventAnalysisDAO = new BaseDAO<EventAnalysis>('event_analysis', analysisFields);

export interface RagDocument extends BaseEntity {
  title: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileUrl?: string;
  category?: string;
  tags?: string;
  chunkStrategy?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  totalChunks?: number;
  charCount?: number;
  status?: string;
  createdBy?: string;
}

export interface RagChunk extends BaseEntity {
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount?: number;
  embedding?: string;
  metadata?: string;
}

const ragDocumentFields = [
  'id', 'title', 'fileName', 'fileType', 'fileSize', 'fileUrl',
  'category', 'tags', 'chunkStrategy', 'chunkSize', 'chunkOverlap',
  'totalChunks', 'charCount', 'status', 'createdBy', 'createdAt', 'updatedAt'
];

const ragChunkFields = [
  'id', 'documentId', 'chunkIndex', 'content', 'tokenCount',
  'embedding', 'metadata', 'createdAt'
];

class RagDocumentDAOImpl extends BaseDAO<RagDocument> {
  constructor() {
    super('rag_documents', ragDocumentFields);
  }

  findByStatus(status: string): RagDocument[] {
    return this.findAll({
      where: { status },
      orderBy: 'createdAt',
      order: 'DESC',
    });
  }

  findByCategory(category: string): RagDocument[] {
    return this.findAll({
      where: { category },
      orderBy: 'createdAt',
      order: 'DESC',
    });
  }

  updateStatus(id: string, status: string, totalChunks?: number): RagDocument | undefined {
    const data: Partial<RagDocument> = { status };
    if (totalChunks !== undefined) {
      data.totalChunks = totalChunks;
    }
    return this.update(id, data);
  }
}

export const RagDocumentDAO = new RagDocumentDAOImpl();

class RagChunkDAOImpl extends BaseDAO<RagChunk> {
  constructor() {
    super('rag_chunks', ragChunkFields);
  }

  findByDocumentId(documentId: string): RagChunk[] {
    return this.findAll({
      where: { documentId },
      orderBy: 'chunkIndex',
      order: 'ASC',
    });
  }

  deleteByDocumentId(documentId: string): number {
    return this.deleteBy('documentId', documentId);
  }

  findAllChunks(): RagChunk[] {
    return this.findAll({
      orderBy: 'createdAt',
      order: 'DESC',
    });
  }
}

export const RagChunkDAO = new RagChunkDAOImpl();

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

const systemConfigFields = [
  'id', 'configKey', 'configValue', 'description', 'createdAt', 'updatedAt'
];

class SystemConfigDAOImpl extends BaseDAO<SystemConfig> {
  constructor() {
    super('system_config', systemConfigFields);
  }

  findByKey(configKey: string): SystemConfig | null {
    const result = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE configKey = ?`
    ).get(configKey);
    return result ? (result as SystemConfig) : null;
  }

  getOrCreate(configKey: string, defaultValue: string, description?: string): SystemConfig {
    let config = this.findByKey(configKey);
    if (!config) {
      config = this.create({
        configKey,
        configValue: defaultValue,
        description,
      });
    }
    return config;
  }

  updateByKey(configKey: string, configValue: string, description?: string): SystemConfig | null {
    const config = this.findByKey(configKey);
    if (!config) {
      return this.create({ configKey, configValue, description });
    }
    
    this.db.prepare(
      `UPDATE ${this.tableName} SET configValue = ?, description = ?, updatedAt = ? WHERE configKey = ?`
    ).run(configValue, description || config.description, dayjs().toISOString(), configKey);
    
    return { ...config, configValue, description: description || config.description };
  }

  getAllConfigs(): Record<string, string> {
    const results = this.findAll();
    const configs: Record<string, string> = {};
    results.forEach((r) => {
      configs[r.configKey] = r.configValue;
    });
    return configs;
  }
}

export const SystemConfigDAO = new SystemConfigDAOImpl();

export interface ChatSession extends BaseEntity {
  title: string;
  scenario: string;
  status: string;
  lastMessageAt?: string;
  messageCount: number;
}

export interface ChatMessage extends BaseEntity {
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
}

const chatSessionFields = [
  'id', 'title', 'scenario', 'status', 'lastMessageAt', 'messageCount', 'createdAt', 'updatedAt'
];

class ChatSessionDAOImpl extends BaseDAO<ChatSession> {
  constructor() {
    super('chat_sessions', chatSessionFields);
  }

  findByStatus(status: string): ChatSession[] {
    const result = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE status = ? ORDER BY updatedAt DESC`
    ).all(status);
    return result as ChatSession[];
  }

  findById(id: string): ChatSession | undefined {
    const result = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE id = ?`
    ).get(id);
    return result ? (result as ChatSession) : undefined;
  }

  update(id: string, data: Partial<Omit<ChatSession, "id" | "createdAt">>): ChatSession | undefined {
    const session = this.findById(id);
    if (!session) return undefined;

    const updateData = { ...data, updatedAt: this.now() };
    const fieldList = Object.keys(updateData).filter(f => f !== 'id' && f !== 'createdAt');
    const placeholders = fieldList.map(f => `${f} = ?`).join(', ');
    const values = fieldList.map(f => updateData[f as keyof typeof updateData]);

    this.db.prepare(
      `UPDATE ${this.tableName} SET ${placeholders} WHERE id = ?`
    ).run(...values, id);

    return { ...session, ...updateData };
  }

  deleteById(id: string): boolean {
    const result = this.db.prepare(
      `DELETE FROM ${this.tableName} WHERE id = ?`
    ).run(id);
    return result.changes > 0;
  }

  incrementMessageCount(sessionId: string, lastMessageAt?: string): void {
    const updateFields: string[] = ['messageCount = messageCount + 1'];
    const values: any[] = [];

    if (lastMessageAt) {
      updateFields.push('lastMessageAt = ?');
      values.push(lastMessageAt);
    }

    updateFields.push('updatedAt = ?');
    values.push(this.now());

    this.db.prepare(
      `UPDATE ${this.tableName} SET ${updateFields.join(', ')} WHERE id = ?`
    ).run(...values, sessionId);
  }
}

const chatMessageFields = [
  'id', 'sessionId', 'role', 'content', 'createdAt'
];

class ChatMessageDAOImpl extends BaseDAO<ChatMessage> {
  constructor() {
    super('chat_messages', chatMessageFields);
  }

  findBySessionId(sessionId: string): ChatMessage[] {
    const result = this.db.prepare(
      `SELECT * FROM ${this.tableName} WHERE sessionId = ? ORDER BY createdAt ASC`
    ).all(sessionId);
    return result as ChatMessage[];
  }

  deleteBySessionId(sessionId: string): void {
    this.db.prepare(
      `DELETE FROM ${this.tableName} WHERE sessionId = ?`
    ).run(sessionId);
  }
}

export const ChatSessionDAO = new ChatSessionDAOImpl();
export const ChatMessageDAO = new ChatMessageDAOImpl();
