import * as service from './matches.service.js';
import { MatchStatus } from '../generated/prisma/client.js';
import { validate } from '../lib/validate.js';
import { z } from 'zod';

const VALID_STATUSES = Object.values(MatchStatus);

const getAllSchema = z.object({
  round: z.coerce.number().int().min(1).optional(),
  status: z.enum(VALID_STATUSES).optional(),
});

const recordResultsSchema = z.object({
  winnerId: z.string().min(1, 'Winner ID is required'),
});

export const getAll = async (req, res) => {
  const { id } = req.params;
  const { round, status } = validate(getAllSchema, req.query);

  const data = await service.getAll(id, round, status);
  res.json(data);
};

export const recordResults = async (req, res) => {
  const { id, matchId } = req.params;
  const { winnerId } = validate(recordResultsSchema, req.body);

  const match = await service.recordResults(id, matchId, winnerId);
  res.status(200).json(match);
};

export const getById = async (req, res) => {
  const { id, matchId } = req.params;
  const match = await service.getById(id, matchId);
  res.json(match);
};
