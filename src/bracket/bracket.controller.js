import * as service from './bracket.service.js';

export const generate = async (req, res) => {
  const { id } = req.params;
  const { thirdPlace } = req.query;
  const thirdPlaceMatch = thirdPlace === 'true';

  await service.generateBracket(id, thirdPlaceMatch);
  res.status(201).json({ message: 'Bracket generated successfully' });
};

export const getBracket = async (req, res) => {
  const { id } = req.params;
  const bracket = await service.getBracket(id);
  res.json(bracket);
};
