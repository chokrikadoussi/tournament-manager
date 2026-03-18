import * as service from './bracket.service.js';
import { validate } from '../lib/validate.js';
import { z } from 'zod';

const generateSchema = z.object({
  thirdPlace: z.string().optional(),
});

const getBracketSchema = z.object({
  format: z.enum(['visual']).optional(),
});

export const generate = async (req, res) => {
  const { id } = req.params;
  const { thirdPlace } = validate(generateSchema, req.query);

  await service.generateBracket(id, thirdPlace === 'true');
  res.status(201).json({ message: 'Bracket generated successfully' });
};

export const getBracket = async (req, res) => {
  const { id } = req.params;
  const { format } = validate(getBracketSchema, req.query);
  const bracket = await service.getBracket(id, format);
  res.json(bracket);
};
