import * as service from './registrations.service.js';
import { validate } from '../lib/validate.js';
import { z } from 'zod';

const registerSchema = z.object({
  competitorId: z.string().min(1, 'Competitor ID is required'),
});

const updateSeedSchema = z.object({
  seed: z.number().int().positive().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

export const getAll = async (req, res) => {
  const { id } = req.params;
  const registrations = await service.getAll(id);
  res.json(registrations);
};

export const register = async (req, res) => {
  const { id } = req.params;
  const { competitorId } = validate(registerSchema, req.body);

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
  const { seed, categoryId } = validate(updateSeedSchema, req.body);

  const registration = await service.updateSeed(id, competitorId, seed, categoryId);
  res.json(registration);
};
