import jwt from 'jsonwebtoken';
import { AppError } from '../lib/AppError.js';

export const requireAuth = (req, _res, next) => {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    throw new AppError('Non authentifié', 401);
  }

  const token = auth.slice(7);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    throw new AppError('Session expirée, veuillez vous reconnecter', 401);
  }
};
