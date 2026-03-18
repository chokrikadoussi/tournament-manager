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

const app = express();
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
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
