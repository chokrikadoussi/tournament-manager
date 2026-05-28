import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/AppError.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body ?? {};

  const ADMIN_USER     = process.env.ADMIN_USER;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  const JWT_SECRET     = process.env.JWT_SECRET;

  if (!ADMIN_USER || !ADMIN_PASSWORD || !JWT_SECRET) {
    throw new AppError('Authentification non configurée sur le serveur', 500);
  }

  if (!username || !password || username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    throw new AppError('Identifiants incorrects', 401);
  }

  const token = jwt.sign({ sub: 'admin' }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token });
});

export default router;
