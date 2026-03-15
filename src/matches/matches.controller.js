import { AppError } from '../lib/AppError.js';
import * as service from './matches.service.js';

export const getAll = async (req, res) => {
  const { id } = req.params;
  const { round } = req.query;

  const roundNumber = round ? parseInt(round, 10) : undefined;
  if (round !== undefined && isNaN(roundNumber)) {
    throw new AppError('round must be a valid integer', 400);
  }

  const matches = await service.getAll(id, roundNumber);
  res.json(matches);
};

export const recordResults = async (req, res) => {
  const { id, matchId } = req.params;
  const { winnerId } = req.body;

  if (!winnerId) {
    throw new AppError('Winner ID is required', 400);
  }

  const match = await service.recordResults(id, matchId, winnerId);
  res.status(200).json(match);
};

export const getById = async (req, res) => {
  const { id, matchId } = req.params;
  const match = await service.getById(id, matchId);
  res.json(match);
};
