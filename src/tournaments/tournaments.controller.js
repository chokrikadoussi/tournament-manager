import { AppError } from '../lib/AppError.js';
import * as service from './tournaments.service.js';
import {
  TournamentStatus,
  TournamentFormat,
} from '../generated/prisma/client.js';

const VALID_FORMATS = Object.values(TournamentFormat);

export const getAll = async (_req, res) => {
  const tournaments = await service.getAll();
  res.json(tournaments);
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
