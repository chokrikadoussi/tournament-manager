import { AppError } from '../lib/AppError.js';
import * as service from './matches.service.js';
import { parsePagination, buildPaginatedResponse } from '../lib/paginate.js';
import { MatchStatus } from '../generated/prisma/client.js';

const VALID_STATUSES = Object.values(MatchStatus);

export const getAll = async (req, res) => {
  const { id } = req.params;
  const { round, status } = req.query;

  const roundNumber = round ? parseInt(round, 10) : undefined;
  if (round !== undefined && (isNaN(roundNumber) || roundNumber < 1)) {
    throw new AppError('round must be a valid integer greater than 0', 400);
  }

  if (status && !VALID_STATUSES.includes(status)) {
    throw new AppError(
      `status must be one of: ${VALID_STATUSES.join(', ')}`,
      400,
    );
  }

  const data = await service.getAll(id, roundNumber, status);
  res.json(data);
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
