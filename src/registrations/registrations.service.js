import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';
import { TournamentStatus } from '../generated/prisma/client.js';

const VALID_STATUS = [TournamentStatus.OPEN, TournamentStatus.DRAFT];

export const getAll = async (id) => {
  return prisma.tournamentRegistration.findMany({
    where: { tournamentId: id },
    include: { competitor: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const register = async (tournamentId, competitorId) => {
  // 1) Vérifier le tournoi
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new AppError('Tournament not found', 404);
  }

  if (!VALID_STATUS.includes(tournament.status)) {
    throw new AppError(
      'Cannot register for a tournament that is not open',
      400,
    );
  }

  // 2) Vérifier le compétiteur
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
  });

  if (!competitor) {
    throw new AppError('Competitor not found', 404);
  }

  // 3) Vérifier max participants
  const registrationCount = await prisma.tournamentRegistration.count({
    where: { tournamentId },
  });

  if (
    tournament.maxParticipants &&
    registrationCount >= tournament.maxParticipants
  ) {
    throw new AppError('Tournament is full', 400);
  }

  // 4) Créer l'inscription + vérif si déjà inscrit (contrainte d'unicité)
  try {
    return await prisma.tournamentRegistration.create({
      data: { tournamentId, competitorId },
      include: {
        competitor: true,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw new AppError('Already registered for this tournament', 409);
    }
    throw error;
  }
};

export const unregister = async (tournamentId, competitorId) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new AppError('Tournament not found', 404);
  }

  if (!VALID_STATUS.includes(tournament.status)) {
    throw new AppError(
      'Cannot unregister from a tournament that is not open',
      400,
    );
  }

  const registration = await prisma.tournamentRegistration.findUnique({
    where: { tournamentId_competitorId: { tournamentId, competitorId } },
  });

  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  await prisma.tournamentRegistration.delete({
    where: { tournamentId_competitorId: { tournamentId, competitorId } },
  });
};

export const updateSeed = async (tournamentId, competitorId, seed) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new AppError('Tournament not found', 404);
  }

  if (!VALID_STATUS.includes(tournament.status)) {
    throw new AppError(
      'Cannot update seed for a tournament that is not open',
      400,
    );
  }

  const registration = await prisma.tournamentRegistration.findUnique({
    where: { tournamentId_competitorId: { tournamentId, competitorId } },
  });

  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  if (seed) {
    const existingSeed = await prisma.tournamentRegistration.findFirst({
      where: {
        tournamentId,
        seed,
        competitorId: { not: competitorId },
      },
    });

    if (existingSeed) {
      throw new AppError('Seed already assigned in this tournament', 409);
    }
  }

  return await prisma.tournamentRegistration.update({
    where: { tournamentId_competitorId: { tournamentId, competitorId } },
    data: { seed },
    include: { competitor: true },
  });
};
