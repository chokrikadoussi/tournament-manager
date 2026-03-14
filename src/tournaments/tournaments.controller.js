import { AppError } from '../lib/AppError.js';
import * as service from './tournaments.service.js';
import { TournamentStatus } from '../generated/prisma/client.js';

const VALID_STATUS = Object.values(TournamentStatus);

export const getAll = async (_req, res) => {
  const tournaments = await service.getAll();
  res.json(tournaments);
};

export const create = async (req, res) => {
  const { name, sport, maxParticipants } = req.body;

  if (!name) {
    throw new AppError('Name is required', 400);
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
  const { name, sport, status, maxParticipants } = req.body;

  if (status && !VALID_STATUS.includes(status)) {
    throw new AppError(
      `status must be one of: ${VALID_STATUS.join(', ')}`,
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
    status,
    maxParticipants,
  });
  res.json(tournament);
};

export const deleteById = async (req, res) => {
  const { id } = req.params;
  await service.deleteById(id);
  res.status(204).send();
};
