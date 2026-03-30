import * as service from './competitors.service.js';
import { CompetitorType, Gender } from '../generated/prisma/client.js';
import { buildPaginatedResponse, parsePagination } from '../lib/paginate.js';
import {z} from 'zod';
import { validate } from '../lib/validate.js';

const VALID_TYPES = Object.values(CompetitorType);
const VALID_GENDERS = Object.values(Gender);

const getAllSchema = z.object({
  type: z.enum(VALID_TYPES).optional(),
  search: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(VALID_TYPES).optional(),
  gender: z.enum(VALID_GENDERS).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  type: z.enum(VALID_TYPES).optional(),
  gender: z.enum(VALID_GENDERS).optional(),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
});

export const getAll = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type, search } = validate(getAllSchema, req.query);

  const [data, total] = await service.getAll(limit, skip, type, search);
  res.json(buildPaginatedResponse(data, total, page, limit));
};

export const create = async (req, res) => {
  const { name, type, gender, birthYear } = validate(createSchema, req.body);

  const competitor = await service.create({ name, type, gender, birthYear });
  res.status(201).json(competitor);
};

export const getById = async (req, res) => {
  const { id } = req.params;
  const competitor = await service.getById(id);
  res.json(competitor);
};

export const updateById = async (req, res) => {
  const { id } = req.params;
  const { name, type, gender, birthYear } = validate(updateSchema, req.body);

  const competitor = await service.updateById(id, { name, type, gender, birthYear });
  res.json(competitor);
};

export const deleteById = async (req, res) => {
  const { id } = req.params;
  await service.deleteById(id);
  res.status(204).send();
};

export const getStats = async (req, res) => {
  const { id } = req.params;
  const competitor = await service.getStatsById(id);
  res.json(competitor);
};
