import { Router } from 'express';
import { asyncWrap } from '../lib/asyncWrap.js';
import * as controller from './competitors.controller.js';

const router = Router();

router.get('/', asyncWrap(controller.getAll));
router.post('/', asyncWrap(controller.create));
router.get('/:id', asyncWrap(controller.getById));
router.patch('/:id', asyncWrap(controller.updateById));
router.delete('/:id', asyncWrap(controller.deleteById));

export default router;
