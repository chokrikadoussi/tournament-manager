import { Router } from 'express';
import { asyncWrap } from '../lib/asyncWrap.js';
import * as controller from './registrations.controller.js';
import { writeLimiter } from '../lib/rateLimiter.js';

// mergeParams: true pour accéder à req.params.id du router parent (tournamentId)
const router = Router({ mergeParams: true });

router.get('/', asyncWrap(controller.getAll));
router.post('/', writeLimiter, asyncWrap(controller.register));
router.delete('/:competitorId', writeLimiter, asyncWrap(controller.unregister));
router.patch('/:competitorId', writeLimiter, asyncWrap(controller.updateSeed));

export default router;
