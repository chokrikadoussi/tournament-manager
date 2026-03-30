import { Router } from 'express';
import { asyncWrap } from '../lib/asyncWrap.js';
import * as controller from './categories.controller.js';
import { writeLimiter } from '../lib/rateLimiter.js';

const router = Router({ mergeParams: true });

router.get('/', asyncWrap(controller.getAll));
router.post('/', writeLimiter, asyncWrap(controller.create));
router.get('/:categoryId', asyncWrap(controller.getById));
router.patch('/:categoryId', writeLimiter, asyncWrap(controller.updateById));
router.delete('/:categoryId', writeLimiter, asyncWrap(controller.deleteById));

router.post('/:categoryId/open', writeLimiter, asyncWrap(controller.openCategory));
router.post('/:categoryId/close', writeLimiter, asyncWrap(controller.closeCategory));
router.post('/:categoryId/start', writeLimiter, asyncWrap(controller.startCategory));
router.post('/:categoryId/cancel', writeLimiter, asyncWrap(controller.cancelCategory));

export default router;
