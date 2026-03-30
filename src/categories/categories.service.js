import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';
import { TournamentStatus, TournamentFormat } from '../generated/prisma/client.js';
import * as tournamentService from '../tournaments/tournaments.service.js';
import { generateSingleElim } from '../bracket/generators/singleElim.js';
import { generateRoundRobin } from '../bracket/generators/roundRobin.js';

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

const getCategoryOrThrow = async (tournamentId, categoryId) => {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, tournamentId },
  });
  if (!category) {
    throw new AppError('Category not found', 404);
  }
  return category;
};

export const openCategory = async (tournamentId, categoryId) => {
  const tournament = await tournamentService.getById(tournamentId);

  if (tournament.status !== TournamentStatus.OPEN) {
    throw new AppError('Le tournoi doit être ouvert pour ouvrir une catégorie', 409);
  }

  const category = await getCategoryOrThrow(tournamentId, categoryId);

  if (category.status !== TournamentStatus.DRAFT) {
    throw new AppError('La catégorie doit être en statut DRAFT pour être ouverte', 409);
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: { status: TournamentStatus.OPEN },
  });
};

export const closeCategory = async (tournamentId, categoryId) => {
  await tournamentService.getById(tournamentId);

  const category = await getCategoryOrThrow(tournamentId, categoryId);

  if (category.status !== TournamentStatus.OPEN) {
    throw new AppError('La catégorie doit être ouverte pour être fermée', 409);
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: { status: TournamentStatus.DRAFT },
  });
};

export const startCategory = async (tournamentId, categoryId) => {
  const tournament = await tournamentService.getById(tournamentId);

  if (
    tournament.status !== TournamentStatus.OPEN &&
    tournament.status !== TournamentStatus.IN_PROGRESS
  ) {
    throw new AppError(
      'Le tournoi doit être ouvert ou en cours pour démarrer une catégorie',
      409,
    );
  }

  const category = await getCategoryOrThrow(tournamentId, categoryId);

  if (category.status !== TournamentStatus.OPEN) {
    throw new AppError('La catégorie doit être ouverte pour être démarrée', 409);
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId, categoryId },
    select: { competitorId: true, seed: true },
    orderBy: { createdAt: 'asc' },
  });

  if (registrations.length < 2) {
    throw new AppError('Au moins 2 participants sont requis pour démarrer une catégorie', 400);
  }

  const participantIds = registrations.map((r) => r.competitorId);

  await prisma.$transaction(async (tx) => {
    switch (tournament.format) {
      case TournamentFormat.SINGLE_ELIM:
        await generateSingleElim(tx, participantIds, tournamentId, registrations, false, categoryId);
        break;
      case TournamentFormat.ROUND_ROBIN:
        await generateRoundRobin(tx, tournamentId, registrations, categoryId);
        break;
      default:
        throw new AppError('Format de tournoi non supporté', 400);
    }

    await tx.category.update({
      where: { id: categoryId },
      data: { status: TournamentStatus.IN_PROGRESS },
    });

    if (tournament.status !== TournamentStatus.IN_PROGRESS) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: TournamentStatus.IN_PROGRESS },
      });
    }
  });

  return prisma.category.findUnique({ where: { id: categoryId } });
};

export const bulkStart = async (tournamentId) => {
  const tournament = await tournamentService.getById(tournamentId);

  if (
    tournament.status !== TournamentStatus.OPEN &&
    tournament.status !== TournamentStatus.IN_PROGRESS
  ) {
    throw new AppError(
      'Le tournoi doit être ouvert ou en cours pour démarrer les catégories',
      409,
    );
  }

  const openCategories = await prisma.category.findMany({
    where: { tournamentId, status: TournamentStatus.OPEN },
  });

  if (openCategories.length === 0) {
    throw new AppError('Aucune catégorie ouverte à démarrer', 400);
  }

  const results = { started: [], failed: [] };

  for (const category of openCategories) {
    try {
      await startCategory(tournamentId, category.id);
      results.started.push({ id: category.id, name: category.name });
    } catch (err) {
      results.failed.push({ id: category.id, name: category.name, reason: err.message });
    }
  }

  return results;
};

export const cancelCategory = async (tournamentId, categoryId) => {
  await tournamentService.getById(tournamentId);

  const category = await getCategoryOrThrow(tournamentId, categoryId);

  const CANCELLABLE = [TournamentStatus.DRAFT, TournamentStatus.OPEN];
  if (!CANCELLABLE.includes(category.status)) {
    throw new AppError("La catégorie ne peut être annulée qu'au statut DRAFT ou OPEN", 409);
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: { status: TournamentStatus.CANCELLED },
  });
};
