import { AppError } from '../lib/AppError.js';
import * as service from './registrations.service.js';

export const getAll = async (req, res) => {
  const { id } = req.params;
  const registrations = await service.getAll(id);
  res.json(registrations);
};

export const register = async (req, res) => {
  const { id } = req.params;
  const { competitorId } = req.body;

  if (!competitorId) {
    throw new AppError('Competitor ID is required', 400);
  }

  const registration = await service.register(id, competitorId);
  res.status(201).json(registration);
};

export const unregister = async (req, res) => {
  const { id, competitorId } = req.params;
  await service.unregister(id, competitorId);
  res.status(204).send();
};

export const updateSeed = async (req, res) => {
  const { id, competitorId } = req.params;
  const { seed } = req.body;

  if (seed === undefined) {
    throw new AppError('Seed is required', 400);
  }

  if (seed !== null && (!Number.isInteger(seed) || seed < 1)) {
    throw new AppError('Seed must be a positive integer', 400);
  }

  const registration = await service.updateSeed(id, competitorId, seed);
  res.json(registration);
};
