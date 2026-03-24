import { Router } from 'express';
import { asyncWrap } from '../lib/asyncWrap.js';
import * as controller from './matches.controller.js';
import { writeLimiter } from '../lib/rateLimiter.js';

const router = Router({ mergeParams: true });

router.get('/', asyncWrap(controller.getAll));
router.post('/:matchId/result', writeLimiter, asyncWrap(controller.recordResults));
router.get('/:matchId', asyncWrap(controller.getById));

export default router;
