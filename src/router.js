import { Router } from 'express';
import competitorRouter from './competitors/competitors.route.js';
import tournamentsRouter from './tournaments/tournaments.route.js';

const router = Router();

router.use('/competitors', competitorRouter);
router.use('/tournaments', tournamentsRouter);

export default router;
