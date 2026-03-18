import { Router } from 'express';
import { asyncWrap } from '../lib/asyncWrap.js';
import * as controller from './tournaments.controller.js';
import registrationRouter from '../registrations/registrations.router.js';
import bracketRouter from '../bracket/bracket.route.js';
import matchesRouter from '../matches/matches.route.js';

const router = Router();

router.get('/', asyncWrap(controller.getAll));
router.post('/', asyncWrap(controller.create));
router.get('/:id', asyncWrap(controller.getById));
router.patch('/:id', asyncWrap(controller.updateById));
router.delete('/:id', asyncWrap(controller.deleteById));

router.post('/:id/open', asyncWrap(controller.openTournament));
router.post('/:id/close-registration', asyncWrap(controller.closeRegistration));
router.post('/:id/cancel', asyncWrap(controller.cancelTournament));


router.use('/:id/registrations', registrationRouter);
router.use('/:id/bracket', bracketRouter);
router.use('/:id/matches', matchesRouter);

export default router;
