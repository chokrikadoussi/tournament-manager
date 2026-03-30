import { z } from 'zod';
import { validate } from '../lib/validate.js';
import * as service from './categories.service.js';
import { Gender } from '../generated/prisma/client.js';

const VALID_GENDER = Object.values(Gender);

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  gender: z.enum(VALID_GENDER),
  birthYearMin: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .optional(),
  birthYearMax: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .optional(),
  maxParticipants: z.coerce.number().int().min(2).optional(),
});

const updateSchema = createSchema.partial();

export const getAll = async (req, res) => {
  const { id } = req.params;
  const registrations = await service.getAll(id);
  res.json(registrations);
};

export const create = async (req, res) => {
  const { id } = req.params;
  const data = validate(createSchema, req.body);

  const category = await service.create(id, data);
  res.status(201).json(category);
};

export const getById = async (req, res) => {
  const { id, categoryId } = req.params;

  const category = await service.getById(id, categoryId);
  res.json(category);
};

export const updateById = async (req, res) => {
  const { id, categoryId } = req.params;
  const data = validate(updateSchema, req.body);

  const category = await service.updateById(id, categoryId, data);
  res.json(category);
};

export const deleteById = async (req, res) => {
  const { id, categoryId } = req.params;
  await service.deleteById(id, categoryId);
  res.status(204).send();
};

export const openCategory = async (req, res) => {
  const { id, categoryId } = req.params;
  const category = await service.openCategory(id, categoryId);
  res.json(category);
};

export const closeCategory = async (req, res) => {
  const { id, categoryId } = req.params;
  const category = await service.closeCategory(id, categoryId);
  res.json(category);
};

export const startCategory = async (req, res) => {
  const { id, categoryId } = req.params;
  const category = await service.startCategory(id, categoryId);
  res.json(category);
};

export const cancelCategory = async (req, res) => {
  const { id, categoryId } = req.params;
  const category = await service.cancelCategory(id, categoryId);
  res.json(category);
};
