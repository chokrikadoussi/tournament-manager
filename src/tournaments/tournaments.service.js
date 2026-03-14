import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';
import { TournamentStatus } from '../generated/prisma/client.js';

export const getAll = async () => {
  return prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

export const create = async (data) => {
  return prisma.tournament.create({ data });
};

export const getById = async (id) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      _count: {
        select: { registrations: true },
      },
    },
  });
  if (!tournament) {
    throw new AppError('Tournament not found', 404);
  }
  return tournament;
};

export const updateById = async (id, data) => {
  await getById(id); // Ensure it exists or throw 404
  return prisma.tournament.update({ where: { id }, data });
};

export const deleteById = async (id) => {
  const tournament = await getById(id);
  if (
    tournament.status === TournamentStatus.IN_PROGRESS ||
    tournament.status === TournamentStatus.COMPLETED
  ) {
    throw new AppError(
      'Cannot delete a tournament that is in progress or completed',
      400,
    );
  }
  await prisma.tournament.delete({ where: { id } });
};
