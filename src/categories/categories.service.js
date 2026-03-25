import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';
import { TournamentStatus } from '../generated/prisma/client.js';
import * as tournamentService from '../tournaments/tournaments.service.js';

const CREATE_VALID_STATUS = [TournamentStatus.OPEN, TournamentStatus.DRAFT];
const UPDATE_VALID_STATUS = [TournamentStatus.DRAFT];
const DELETE_VALID_STATUS = [TournamentStatus.DRAFT];

export const getAll = async (tournamentId) => {
  return prisma.category.findMany({
    where: { tournamentId },
    orderBy: { birthYearMax: 'desc' },
    include: {
      _count: { select: { registrations: true } },
    },
  });
};

export const create = async (tournamentId, data) => {
  const tournament = await tournamentService.getById(tournamentId);

  if (!CREATE_VALID_STATUS.includes(tournament.status)) {
    throw new AppError('Invalid tournament status', 400);
  }

  if (
    data.birthYearMax &&
    data.birthYearMin &&
    data.birthYearMax < data.birthYearMin
  ) {
    throw new AppError('birthYearMax must be greater than birthYearMin', 400);
  }

  return prisma.category.create({
    data: { ...data, tournamentId },
  });
};

export const getById = async (tournamentId, categoryId) => {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, tournamentId },
    include: {
      registrations: {
        include: { competitor: true },
      },
    },
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  return category;
};

export const updateById = async (tournamentId, categoryId, data) => {
  const tournament = await tournamentService.getById(tournamentId);

  if (!UPDATE_VALID_STATUS.includes(tournament.status)) {
    throw new AppError('Invalid tournament status', 400);
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, tournamentId },
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  if (
    data.birthYearMax &&
    data.birthYearMin &&
    data.birthYearMax < data.birthYearMin
  ) {
    throw new AppError('birthYearMax must be greater than birthYearMin', 400);
  }

  if (
    data.birthYearMin &&
    category.birthYearMax &&
    data.birthYearMin > category.birthYearMax
  ) {
    throw new AppError(
      'birthYearMin cannot be greater than existing birthYearMax',
      400,
    );
  }

  if (
    data.birthYearMax &&
    category.birthYearMin &&
    data.birthYearMax < category.birthYearMin
  ) {
    throw new AppError(
      'birthYearMax cannot be less than existing birthYearMin',
      400,
    );
  }

  return prisma.category.update({
    where: { id: categoryId },
    data,
  });
};

export const deleteById = async (tournamentId, categoryId) => {
  const tournament = await tournamentService.getById(tournamentId);

  if (!DELETE_VALID_STATUS.includes(tournament.status)) {
    throw new AppError('Invalid tournament status', 400);
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, tournamentId },
    include: {
      registrations: {
        include: { competitor: true },
      },
    },
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  if (category.registrations.length > 0) {
    throw new AppError(
      'Cannot delete category with registered competitors',
      400,
    );
  }

  await prisma.category.delete({
    where: { id: categoryId },
  });
};
