import { Router } from 'express';
import competitorRouter from './competitors/competitors.route.js';

const router = Router();

router.use('/competitors', competitorRouter);

export default router;
