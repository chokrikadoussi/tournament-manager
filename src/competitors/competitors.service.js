import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';

export const getAll = async () => {
  return prisma.competitor.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export const create = async (data) => {
  return prisma.competitor.create({ data });
};

export const getById = async (id) => {
  const competitor = await prisma.competitor.findUnique({ where: { id } });
  if (!competitor) {
    throw new AppError('Competitor not found', 404);
  }
  return competitor;
};

export const updateById = async (id, data) => {
  await getById(id); // Ensure it exists or throw 404
  return prisma.competitor.update({ where: { id }, data });
};

export const deleteById = async (id) => {
  await getById(id); // Ensure it exists or throw 404
  await prisma.competitor.delete({ where: { id } });
};
