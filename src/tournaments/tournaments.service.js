import { prisma } from '../db.js';
import { AppError } from '../lib/AppError.js';
import { MatchStatus, TournamentStatus } from '../generated/prisma/client.js';

const TRANSITIONS = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['DRAFT', 'CANCELLED'],
  IN_PROGRESS: ['CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const getAll = async (limit, skip, status, sport) => {
  const where = {};
  if (status) {
    where.status = status;
  }

  if (sport) {
    where.sport = { equals: sport, mode: 'insensitive' };
  }

  return prisma.$transaction([
    prisma.tournament.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.tournament.count({ where }),
  ]);
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

export const getStatsById = async (id) => {
  const tournament = await getById(id); // Ensure it exists or throw 404

  if (
    tournament.status === TournamentStatus.DRAFT ||
    tournament.status === TournamentStatus.OPEN
  ) {
    throw new AppError(
      'Stats are only available for tournaments that are in progress or completed',
      400,
    );
  }

  const totalMatches = await prisma.match.count({
    where: { tournamentId: id, status: { not: MatchStatus.BYE } },
  });

  const completedMatches = await prisma.match.count({
    where: { tournamentId: id, status: MatchStatus.COMPLETED },
  });

  const pendingMatches = totalMatches - completedMatches;
  const completionRate =
    totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0;

  const topCompetitors = await prisma.match.groupBy({
    by: ['winnerId'],
    where: { tournamentId: id, status: MatchStatus.COMPLETED },
    orderBy: { _count: { winnerId: 'desc' } },
    take: 5,
    _count: { winnerId: true },
  });
  const competitorIds = topCompetitors.map((c) => c.winnerId);
  const competitors = await prisma.competitor.findMany({
    where: { id: { in: competitorIds } },
  });
  const competitorsMap = Object.fromEntries(
    competitors.map((c) => [c.id, c.name]),
  );

  return {
    tournamentId: tournament.id,
    name: tournament.name,
    format: tournament.format,
    status: tournament.status,
    stats: {
      totalMatches,
      completedMatches,
      pendingMatches,
      completionRate,
      totalParticipants: tournament._count.registrations,
    },
    topCompetitors: topCompetitors.map((c) => ({
      competitorId: c.winnerId,
      name: competitorsMap[c.winnerId],
      wins: c._count.winnerId,
    })),
  };
};
