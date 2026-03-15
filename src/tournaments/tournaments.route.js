import { Router } from 'express';
import { asyncWrap } from '../lib/asyncWrap.js';
import * as controller from './tournaments.controller.js';
import registrationRouter from '../registrations/registrations.router.js';
import bracketRouter from '../bracket/bracket.route.js';

const router = Router();

router.get('/', asyncWrap(controller.getAll));
router.post('/', asyncWrap(controller.create));
router.get('/:id', asyncWrap(controller.getById));
router.patch('/:id', asyncWrap(controller.updateById));
router.delete('/:id', asyncWrap(controller.deleteById));

router.use('/:id/registrations', registrationRouter);
router.use('/:id/bracket', bracketRouter);

export default router;
