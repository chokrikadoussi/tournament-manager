import { AppError } from '../lib/AppError.js';
import * as service from './competitors.service.js';
import { CompetitorType } from '../generated/prisma/client.js';
import { buildPaginatedResponse, parsePagination } from '../lib/paginate.js';

const VALID_TYPES = Object.values(CompetitorType);

export const getAll = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type, search } = req.query;

  if (type && !VALID_TYPES.includes(type)) {
    throw new AppError(`type must be one of: ${VALID_TYPES.join(', ')}`, 400);
  }
  
  const [data, total] = await service.getAll(limit, skip, type, search);
  res.json(buildPaginatedResponse(data, total, page, limit));
};

export const create = async (req, res) => {
  const { name, type } = req.body;

  if (!name) {
    throw new AppError('Name is required', 400);
  }

  if (type && !VALID_TYPES.includes(type)) {
    throw new AppError(`type must be one of: ${VALID_TYPES.join(', ')}`, 400);
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
    throw new AppError(`type must be one of: ${VALID_TYPES.join(', ')}`, 400);
  }

  const competitor = await service.updateById(id, { name, type });
  res.json(competitor);
};

export const deleteById = async (req, res) => {
  const { id } = req.params;
  await service.deleteById(id);
  res.status(204).send();
};
