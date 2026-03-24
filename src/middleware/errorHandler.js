import { Prisma } from '../generated/prisma/index.js';
import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';

const NODE_ENV = process.env.NODE_ENV || 'development';

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        res.status(409).json({ error: 'Unique constraint failed' });
        break;
      case 'P2025':
        res.status(404).json({ error: 'Record not found' });
        break;
      default:
        res.status(500).json({ error: 'Database error' });
        break;
    }
    return;
  }

  if (NODE_ENV === 'production') {
    logger.error({ err: err.message }, 'Unhandled error');
  } else {
    logger.error({ err }, 'Unhandled error');
  }
  res.status(500).json({ error: 'Internal Server Error' });
};
