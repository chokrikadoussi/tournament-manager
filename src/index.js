import 'dotenv/config';
import { prisma } from './db.js';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import router from './router.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import morgan from 'morgan';
import { apiLimiter } from './lib/rateLimiter.js';

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set');
  process.exit(1);
}

const app = express();
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', apiLimiter);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

app.use('/api/v1', router);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 3000);

async function start() {
  await prisma.$connect();
  const server = app.listen(port, () => {
    console.log(`API ready on http://localhost:${port}`);
  });

  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  process.on('SIGINT', () => server.close(() => process.exit(0)));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
