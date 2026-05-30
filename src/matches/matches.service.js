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

  // 3. Transaction : enregistrer le résultat, avancer le vainqueur, router le
  //    perdant de demi-finale vers la petite finale, puis évaluer la complétion.
  let tournamentCompleted = false;

  const updatedMatch = await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: matchId },
      data: { winnerId, status: MatchStatus.COMPLETED },
    });

    // Nombre de tours pour CETTE catégorie (chaque catégorie a son bracket).
    const totalParticipants = await tx.tournamentRegistration.count({
      where: { tournamentId, ...(match.categoryId && { categoryId: match.categoryId }) },
    });
    const totalRounds = getTotalRounds(totalParticipants);

    // ── Avancer le vainqueur vers le match suivant ──
    if (match.nextMatchId) {
      const slot = match.position % 2 === 0 ? 0 : 1;
      await tx.matchParticipant.create({
        data: { matchId: match.nextMatchId, competitorId: winnerId, slot },
      });
      const count = await tx.matchParticipant.count({ where: { matchId: match.nextMatchId } });
      if (count === 2) {
        await tx.match.update({
          where: { id: match.nextMatchId },
          data: { status: MatchStatus.READY },
        });
      }
    }

    // ── Petite finale (3e place) : router le perdant de demi-finale ──
    if (match.round === totalRounds - 1) {
      const petiteFinale = await tx.match.findFirst({
        where: {
          tournamentId,
          round: totalRounds,
          position: 1,
          ...(match.categoryId && { categoryId: match.categoryId }),
        },
        select: { id: true },
      });

      if (petiteFinale) {
        const loserId = match.participants.find((p) => p.competitorId !== winnerId)?.competitorId;
        const slot = match.position % 2 === 0 ? 0 : 1;
        if (loserId) {
          await tx.matchParticipant.create({
            data: { matchId: petiteFinale.id, competitorId: loserId, slot },
          });
        }

        const pfCount = await tx.matchParticipant.count({ where: { matchId: petiteFinale.id } });
        if (pfCount === 2) {
          await tx.match.update({
            where: { id: petiteFinale.id },
            data: { status: MatchStatus.READY },
          });
        } else {
          // L'autre demi-finale n'apporte pas de perdant (BYE, ex. 3 inscrits) :
          // dès qu'aucune demie n'est plus jouable, le seul présent prend le
          // bronze par forfait.
          const semisRestantes = await tx.match.count({
            where: {
              tournamentId,
              round: totalRounds - 1,
              status: { in: [MatchStatus.PENDING, MatchStatus.READY] },
              ...(match.categoryId && { categoryId: match.categoryId }),
            },
          });
          if (semisRestantes === 0 && pfCount === 1) {
            const lone = await tx.matchParticipant.findFirst({
              where: { matchId: petiteFinale.id },
              select: { competitorId: true },
            });
            await tx.match.update({
              where: { id: petiteFinale.id },
              data: { status: MatchStatus.COMPLETED, winnerId: lone.competitorId },
            });
          }
        }
      }
    }

    // ── Complétion : la catégorie (ou le tournoi sans catégorie) est terminée
    //    quand il ne reste plus AUCUN match jouable (finale ET petite finale). ──
    const remaining = await tx.match.count({
      where: {
        tournamentId,
        status: { in: [MatchStatus.PENDING, MatchStatus.READY] },
        ...(match.categoryId && { categoryId: match.categoryId }),
      },
    });

    if (remaining === 0) {
      if (match.categoryId) {
        await tx.category.update({
          where: { id: match.categoryId },
          data: { status: TournamentStatus.COMPLETED },
        });
        const pendingCats = await tx.category.count({
          where: {
            tournamentId,
            status: { notIn: [TournamentStatus.COMPLETED, TournamentStatus.CANCELLED] },
          },
        });
        if (pendingCats === 0) {
          await tx.tournament.update({
            where: { id: tournamentId },
            data: { status: TournamentStatus.COMPLETED },
          });
          tournamentCompleted = true;
        }
      } else {
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: TournamentStatus.COMPLETED },
        });
        tournamentCompleted = true;
      }
    }

    return tx.match.findUnique({
      where: { id: matchId },
      include: { participants: { include: { competitor: true } } },
    });
  });

  return { match: updatedMatch, tournamentCompleted };
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
