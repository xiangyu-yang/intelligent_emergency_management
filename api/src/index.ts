import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { initDatabase } from './db/sqlite.js';
import { seedDatabase } from './db/seed.js';
import fs from 'fs';
import path from 'path';
import eventMonitorRouter from './routes/events/monitor.js';
import taskRouter from './routes/events/tasks.js';
import aiSolutionRouter from './routes/ai/solution.js';
import correlationRouter from './routes/analysis/correlation.js';
import selfLearningRouter from './routes/analysis/selfLearning.js';
import knowledgeRouter from './routes/knowledge/base.js';
import ragRouter from './routes/rag/index.js';
import eventTypesRouter from './routes/config/eventTypes.js';
import planTemplatesRouter from './routes/config/planTemplates.js';
import solutionTemplatesRouter from './routes/config/solutionTemplates.js';
import organizationRouter from './routes/config/organization.js';
import resourcesRouter from './routes/config/resources.js';
import solutionsRouter from './routes/solutions/index.js';

async function startServer() {
  const dataDir = path.join(process.cwd(), 'data');
  const uploadsDir = path.join(process.cwd(), 'uploads');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  initDatabase();
  seedDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 4001;

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('dev'));

  app.use('/uploads', express.static(uploadsDir));

  app.get('/api/health', (_req, res) => {
    res.json({ code: 0, message: 'ok', data: { status: 'running' } });
  });

  app.use('/api/events', eventMonitorRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api/solutions', solutionsRouter);
  app.use('/api/ai', aiSolutionRouter);

  app.use('/api/config/event-types', eventTypesRouter);
  app.use('/api/config/plan-templates', planTemplatesRouter);
  app.use('/api/config/solution-templates', solutionTemplatesRouter);
  app.use('/api/config/organization', organizationRouter);
  app.use('/api/config/resources', resourcesRouter);

  app.use('/api/analysis', correlationRouter);
  app.use('/api/self-learning', selfLearningRouter);
  app.use('/api/knowledge', knowledgeRouter);
  app.use('/api/rag', ragRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[api error]', err);
    res.status(500).json({ code: 500, message: err.message || '服务器异常' });
  });

  app.listen(PORT, () => {
    console.log(`智能应急管理系统 API 已启动 → http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
