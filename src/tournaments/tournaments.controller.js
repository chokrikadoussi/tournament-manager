import * as service from './tournaments.service.js';
import * as categoriesService from '../categories/categories.service.js';
import {
  TournamentFormat,
  TournamentStatus,
} from '../generated/prisma/client.js';
import { buildPaginatedResponse, parsePagination } from '../lib/paginate.js';
import { z } from 'zod';
import { validate } from '../lib/validate.js';

const VALID_FORMATS = Object.values(TournamentFormat);
const VALID_STATUSES = Object.values(TournamentStatus);

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sport: z.string().optional(),
  maxParticipants: z.coerce
    .number()
    .int()
    .min(2, 'maxParticipants must be at least 2')
    .optional(),
  format: z.enum(VALID_FORMATS).optional(),
});

const getAllSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  sport: z.string().optional(),
});

const updateSchema = createSchema.partial();

export const getAll = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { status, sport } = validate(getAllSchema, req.query);

  const [data, total] = await service.getAll(limit, skip, status, sport);
  res.json(buildPaginatedResponse(data, total, page, limit));
};

export const create = async (req, res) => {
  const data = validate(createSchema, req.body);

  const tournament = await service.create(data);
  res.status(201).json(tournament);
};

export const getById = async (req, res) => {
  const { id } = req.params;
  const tournament = await service.getById(id);
  res.json(tournament);
};

export const updateById = async (req, res) => {
  const { id } = req.params;
  const data = validate(updateSchema, req.body);

  const tournament = await service.updateById(id, data);
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

export const bulkStartCategories = async (req, res) => {
  const { id } = req.params;
  const results = await categoriesService.bulkStart(id);
  res.json(results);
};
