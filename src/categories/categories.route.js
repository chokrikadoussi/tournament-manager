import { Router } from 'express';
import { asyncWrap } from '../lib/asyncWrap.js';
import * as controller from './categories.controller.js';

const router = Router({ mergeParams: true });

router.get('/', asyncWrap(controller.getAll));
router.post('/', asyncWrap(controller.create));
router.get('/:categoryId', asyncWrap(controller.getById));
router.patch('/:categoryId', asyncWrap(controller.updateById));
router.delete('/:categoryId', asyncWrap(controller.deleteById));

export default router;
