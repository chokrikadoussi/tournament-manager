import { getTotalRounds } from '../bracket/bracket.utils.js';
import { prisma } from '../db.js';
import { MatchStatus, TournamentStatus } from '../generated/prisma/client.js';
import { AppError } from '../lib/AppError.js';

export const getAll = async (tournamentId, round, status) => {
  const where = { tournamentId };

  if (round) {
    where.round = round;
  }
  if (status) {
    where.status = status;
  }

  return prisma.match.findMany({
    where,
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
    include: { participants: { include: { competitor: true } } },
  });
};

export const recordResults = async (tournamentId, matchId, winnerId) => {
  // 1. Charger le match avec ses participants
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: true },
  });

  // 2. Validations
  if (!match || match.tournamentId !== tournamentId) {
    throw new AppError('Match not found', 404);
  }

  if (match.status !== MatchStatus.READY) {
    throw new AppError(
      'Match is not ready (status: ' + match.status + ')',
      400,
    );
  }

  const participantIds = match.participants.map((p) => p.competitorId);
  if (!participantIds.includes(winnerId)) {
    throw new AppError('Winner must be one of the match participants', 400);
  }

  // 3. Transaction pour enregistrer le résultat et mettre à jour le statut du match
  const updatedMatch = await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: matchId },
      data: {
        winnerId,
        status: MatchStatus.COMPLETED,
      },
    });

    if (match.nextMatchId) {
      const slot = match.position % 2 === 0 ? 0 : 1;

      await tx.matchParticipant.create({
        data: {
          matchId: match.nextMatchId,
          competitorId: winnerId,
          slot,
        },
      });

      const count = await tx.matchParticipant.count({
        where: { matchId: match.nextMatchId },
      });

      if (count === 2) {
        await tx.match.update({
          where: { id: match.nextMatchId },
          data: { status: MatchStatus.READY },
        });
      }

      // Gestion de la troisième place pour les tournois à élimination simple
      const totalParticipants = await tx.tournamentRegistration.count({
        where: { tournamentId: tournamentId },
      });

      const totalRounds = getTotalRounds(totalParticipants);

      if (match.round === totalRounds - 1) {
        const FinalLoser = await tx.match.findFirst({
          where: {
            tournamentId: tournamentId,
            round: totalRounds,
            position: 1,
          },
          select: { id: true },
        });

        if (FinalLoser) {
          const loserId = match.participants.find(
            (p) => p.competitorId !== winnerId,
          )?.competitorId;

          await tx.matchParticipant.create({
            data: {
              matchId: FinalLoser.id,
              competitorId: loserId,
              slot,
            },
          });

          const thirdPlaceCount = await tx.matchParticipant.count({
            where: { matchId: FinalLoser.id },
          });

          if (thirdPlaceCount === 2) {
            await tx.match.update({
              where: { id: FinalLoser.id },
              data: { status: MatchStatus.READY },
            });
          }
        }
      }
    } else {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: TournamentStatus.COMPLETED },
      });
    }

    return tx.match.findUnique({
      where: { id: matchId },
      include: { participants: { include: { competitor: true } } },
    });
  });
  return {
    match: updatedMatch,
    tournamentCompleted: !match.nextMatchId,
    ...(!match.nextMatchId && { champion: winnerId }),
  };
};

export const getById = async (tournamentId, matchId) => {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { participants: { include: { competitor: true } } },
  });
  if (!match || match.tournamentId !== tournamentId) {
    throw new AppError('Match not found', 404);
  }
  return match;
};
