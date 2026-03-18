import { Router } from 'express';
import { asyncWrap } from '../lib/asyncWrap.js';
import * as controller from './bracket.controller.js';
import { writeLimiter } from '../lib/rateLimiter.js';

const router = Router({ mergeParams: true });

router.get('/', asyncWrap(controller.getBracket));
router.post('/', writeLimiter, asyncWrap(controller.generate));

export default router;
