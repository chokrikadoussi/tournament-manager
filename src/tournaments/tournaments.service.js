import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';
import { TournamentStatus } from '../generated/prisma/client.js';

const TRANSITIONS = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['DRAFT', 'CANCELLED'],
  IN_PROGRESS: ['CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

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

export const transitionStatus = async (id, newStatus) => {
  const tournament = await getById(id);

  const allowedTransitions = TRANSITIONS[tournament.status] ?? [];

  if (!allowedTransitions.includes(newStatus)) {
    throw new AppError(
      `Cannot transition tournament from ${tournament.status} to ${newStatus}`,
      400,
    );
  }

  if (newStatus === TournamentStatus.DRAFT) {
    const registrationCount = tournament._count.registrations;
    if (registrationCount < 2) {
      throw new AppError(
        'Cannot transition to DRAFT status with fewer than 2 registrations',
        400,
      );
    }
  }

  return prisma.tournament.update({
    where: { id },
    data: { status: newStatus },
  });
};
