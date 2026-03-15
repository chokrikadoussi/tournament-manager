import * as service from './bracket.service.js';

export const generate = async (req, res) => {
  const { id } = req.params;
  await service.generateBracket(id);
  res.status(201).json({ message: 'Bracket generated successfully' });
};

export const getBracket = async (req, res) => {
  const { id } = req.params;
  const bracket = await service.getBracket(id);
  res.json(bracket);
};
