import { AppError } from '../lib/AppError.js';
import * as service from './tournaments.service.js';
import {
  TournamentFormat,
  TournamentStatus,
} from '../generated/prisma/client.js';
import { buildPaginatedResponse, parsePagination } from '../lib/paginate.js';

const VALID_FORMATS = Object.values(TournamentFormat);
const VALID_STATUSES = Object.values(TournamentStatus);

export const getAll = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, sport } = req.query;

  if (status && !VALID_STATUSES.includes(status)) {
    throw new AppError(
      `status must be one of: ${VALID_STATUSES.join(', ')}`,
      400,
    );
  }
  const [data, total] = await service.getAll(limit, skip, status, sport);
  res.json(buildPaginatedResponse(data, total, page, limit));
};

export const create = async (req, res) => {
  const { name, sport, maxParticipants, format } = req.body;

  if (!name) {
    throw new AppError('Name is required', 400);
  }

  if (format && !VALID_FORMATS.includes(format)) {
    throw new AppError(
      `format must be one of: ${VALID_FORMATS.join(', ')}`,
      400,
    );
  }

  if (
    maxParticipants !== undefined &&
    (!Number.isInteger(maxParticipants) || maxParticipants < 2)
  ) {
    throw new AppError(
      'maxParticipants must be a positive integer greater than 1',
      400,
    );
  }

  const tournament = await service.create({
    name,
    sport,
    maxParticipants,
    format,
  });
  res.status(201).json(tournament);
};

export const getById = async (req, res) => {
  const { id } = req.params;
  const tournament = await service.getById(id);
  res.json(tournament);
};

export const updateById = async (req, res) => {
  const { id } = req.params;
  const { name, sport, maxParticipants, format } = req.body;

  if (format && !VALID_FORMATS.includes(format)) {
    throw new AppError(
      `format must be one of: ${VALID_FORMATS.join(', ')}`,
      400,
    );
  }

  if (
    maxParticipants !== undefined &&
    (!Number.isInteger(maxParticipants) || maxParticipants < 2)
  ) {
    throw new AppError(
      'maxParticipants must be a positive integer greater than 1',
      400,
    );
  }

  const tournament = await service.updateById(id, {
    name,
    sport,
    maxParticipants,
    format,
  });
  res.json(tournament);
};

export const deleteById = async (req, res) => {
  const { id } = req.params;
  await service.deleteById(id);
  res.status(204).send();
};

export const openTournament = async (req, res) => {
  const { id } = req.params;
  const tournament = await service.transitionStatus(id, TournamentStatus.OPEN);
  res.json(tournament);
};

export const closeRegistration = async (req, res) => {
  const { id } = req.params;
  const tournament = await service.transitionStatus(id, TournamentStatus.DRAFT);
  res.json(tournament);
};

export const cancelTournament = async (req, res) => {
  const { id } = req.params;
  const tournament = await service.transitionStatus(
    id,
    TournamentStatus.CANCELLED,
  );
  res.json(tournament);
};

export const getStats = async (req, res) => {
  const { id } = req.params;
  const stats = await service.getStatsById(id);
  res.json(stats);
};
