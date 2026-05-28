import { Router } from 'express';
import competitorRouter from './competitors/competitors.route.js';
import tournamentsRouter from './tournaments/tournaments.route.js';
import authRouter from './auth/auth.router.js';
import { requireAuth } from './middleware/authMiddleware.js';

const router = Router();

// Public
router.use('/auth', authRouter);

// Protected
router.use('/competitors', requireAuth, competitorRouter);
router.use('/tournaments', requireAuth, tournamentsRouter);

export default router;
