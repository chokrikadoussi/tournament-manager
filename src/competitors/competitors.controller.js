import { AppError } from '../lib/AppError.js';
import * as service from './competitors.service.js';
import { CompetitorType } from '../generated/prisma/client.js';

const VALID_TYPES = Object.values(CompetitorType);

export const getAll = async (_req, res) => {
  const competitors = await service.getAll();
  res.json(competitors);
};

export const create = async (req, res) => {
  const { name, type } = req.body;

  if (!name) {
    throw new AppError('Name is required', 400);
  }

  if (type && !VALID_TYPES.includes(type)) {
    throw new AppError(
      `type must be one of: ${Array.from(VALID_TYPES).join(', ')}`,
      400,
    );
  }

  const competitor = await service.create({ name, type });
  res.status(201).json(competitor);
};

export const getById = async (req, res) => {
  const { id } = req.params;
  const competitor = await service.getById(id);
  res.json(competitor);
};

export const updateById = async (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;

  if (type && !VALID_TYPES.includes(type)) {
    throw new AppError(
      `type must be one of: ${Array.from(VALID_TYPES).join(', ')}`,
      400,
    );
  }

  const competitor = await service.updateById(id, { name, type });
  res.json(competitor);
};

export const deleteById = async (req, res) => {
  const { id } = req.params;
  await service.deleteById(id);
  res.status(204).send();
};
