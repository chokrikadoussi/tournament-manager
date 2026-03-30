import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import tournamentsApi from '@/api/tournaments.js';
import bracketApi from '@/api/bracket.js';
import matchesApi from '@/api/matches.js';
import { queryClient } from '@/main.jsx';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import TableSkeleton from '@/components/TableSkeleton.jsx';
import CompetitorTypeBadge from '@/components/CompetitorTypeBadge.jsx';
import TournamentStatusBadge from '@/components/TournamentStatusBadge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { toastSuccess, toastError } from '@/lib/toast.js';
import BracketView from '@/components/BracketView.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Check, Trophy, Pencil } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx';
import CategoriesTab from '@/pages/tabs/CategoriesTab.jsx';
import InscriptionsTab from '@/pages/tabs/InscriptionsTab.jsx';

const MATCH_STATUS_CONFIG = {
  PENDING:  { label: 'En attente', className: 'bg-muted text-muted-foreground hover:bg-muted' },
  READY:    { label: 'Prêt', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  BYE:      { label: 'Bye', className: 'bg-muted text-muted-foreground hover:bg-muted' },
  COMPLETED:{ label: 'Terminé', className: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400', icon: Check },
};

const ROW_CLASS = {
  COMPLETED: 'bg-muted/30',
  BYE: 'opacity-50',
  READY: 'ring-1 ring-inset ring-primary/30 bg-primary/5',
};

const TournamentDetail = () => {
  const tournamentId = useParams().id;
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);

  const getTournament = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => tournamentsApi.getById(tournamentId),
  });

  const tournament = getTournament.data;

  const getRegistrations = useQuery({
    queryKey: ['tournament', tournamentId, 'registrations'],
    queryFn: () => registrationsApi.getAll(tournamentId),
  });

  const getBracket = useQuery({
    queryKey: ['tournament', tournamentId, 'bracket'],
    queryFn: () => bracketApi.getBracket(tournamentId),
    enabled: ['IN_PROGRESS', 'COMPLETED'].includes(tournament?.status),
  });

  const getBracketRound = useQuery({
    queryKey: ['matches', tournamentId, currentRound],
    queryFn: () => matchesApi.getByTournament(tournamentId, currentRound),
    enabled: ['IN_PROGRESS', 'COMPLETED'].includes(tournament?.status),
  });

  const registrations = getRegistrations.data || [];
  const bracket = ['IN_PROGRESS', 'COMPLETED'].includes(tournament?.status) ? getBracket.data : null;
  const currentRoundMatches = getBracketRound.data || [];

  const bracketMap = new Map();
  if (bracket?.rounds) {
    bracket.rounds.forEach(({ round, matches }) => bracketMap.set(round, matches));
  }

  const finalMatch = bracket ? bracketMap.get(bracket.totalRounds)?.[0] : null;
  const champion = finalMatch?.winnerId
    ? registrations.find((r) => r.competitor.id === finalMatch.winnerId)?.competitor?.name
    : null;

  // Mutations
  const openInscriptionsMutation = useMutation({
    mutationFn: (id) => tournamentsApi.openInscriptions(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }); toastSuccess('Inscriptions ouvertes'); },
    onError: (error) => toastError(error.error || "Erreur lors de l'ouverture des inscriptions"),
  });

  const closeInscriptionsMutation = useMutation({
    mutationFn: (id) => tournamentsApi.closeInscriptions(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }); toastSuccess('Inscriptions clôturées'); },
    onError: (error) => toastError(error.error || 'Erreur lors de la clôture des inscriptions'),
  });

  const startTournamentMutation = useMutation({
    mutationFn: (id) => tournamentsApi.startTournament(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] }); toastSuccess('Tournoi démarré'); },
    onError: (error) => toastError(error.error || 'Erreur lors du démarrage du tournoi'),
  });

  const recordResultMutation = useMutation({
    mutationFn: ({ matchId, winnerId }) => matchesApi.recordResult(tournamentId, matchId, winnerId),
    onSuccess: () => {
      setSelectedMatch(null); setPendingResult(null);
      queryClient.invalidateQueries({ queryKey: ['matches', tournamentId, currentRound] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId, 'bracket'] });
      toastSuccess('Résultat enregistré');
    },
    onError: (error) => toastError(error.error || "Erreur lors de l'enregistrement du résultat"),
  });

  const handleInscriptions = (action) => {
    if (action === 'open') openInscriptionsMutation.mutate(tournamentId);
    else if (action === 'close') closeInscriptionsMutation.mutate(tournamentId);
  };

  if (getTournament.isLoading) return <TableSkeleton cols={5} />;
  if (getTournament.isError) return <p className="text-sm text-destructive">Impossible de charger le tournoi.</p>;

  return (
    <div className="tournament-detail">
      {tournament && (
        <Breadcrumb className="text-sm text-muted-foreground mb-4">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Accueil</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/tournaments">Tournois</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{tournament.name}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex items-center gap-3 mb-4">
        <h1>{tournament.name}</h1>
        <TournamentStatusBadge status={tournament.status} />
      </div>

      {tournament.status === 'COMPLETED' && champion && (
        <Card className="border-primary/30 bg-primary/5 mb-4">
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Champion</p>
              <p className="text-xl font-bold text-primary">{champion}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="inscriptions">Inscriptions</TabsTrigger>
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
        </TabsList>

        {/* ── GÉNÉRAL ── */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {tournament.status === 'DRAFT' && (
              <>
                <Button onClick={() => handleInscriptions('open')} disabled={openInscriptionsMutation.isPending}>
                  Ouvrir les inscriptions
                </Button>
                {registrations.length >= 2 && (
                  <ConfirmActionDialog
                    trigger={<Button disabled={startTournamentMutation.isPending}>Démarrer le tournoi</Button>}
                    title="Démarrer le tournoi ?"
                    description="Le bracket sera généré et les inscriptions seront clôturées. Cette action est irréversible."
                    confirmLabel="Démarrer"
                    onConfirm={() => startTournamentMutation.mutate(tournamentId)}
                  />
                )}
              </>
            )}
            {tournament.status === 'OPEN' && (
              <>
                <Button onClick={() => handleInscriptions('close')} disabled={closeInscriptionsMutation.isPending}>
                  Clôturer les inscriptions
                </Button>
                {registrations.length >= 2 && (
                  <ConfirmActionDialog
                    trigger={<Button disabled={startTournamentMutation.isPending}>Démarrer le tournoi</Button>}
                    title="Démarrer le tournoi ?"
                    description="Le bracket sera généré et les inscriptions seront clôturées. Cette action est irréversible."
                    confirmLabel="Démarrer"
                    onConfirm={() => startTournamentMutation.mutate(tournamentId)}
                  />
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
            <div><span className="text-muted-foreground">Format</span><p className="font-medium mt-0.5">{tournament.format}</p></div>
            <div><span className="text-muted-foreground">Sport</span><p className="font-medium mt-0.5">{tournament.sport || '—'}</p></div>
            <div><span className="text-muted-foreground">Inscrits</span><p className="font-medium mt-0.5">{tournament._count?.registrations ?? 0}</p></div>
          </div>
        </TabsContent>

        {/* ── CATÉGORIES ── */}
        <TabsContent value="categories" className="mt-4">
          <CategoriesTab tournamentId={tournamentId} tournamentStatus={tournament.status} />
        </TabsContent>

        {/* ── INSCRIPTIONS ── */}
        <TabsContent value="inscriptions" className="mt-4">
          <InscriptionsTab tournamentId={tournamentId} tournamentStatus={tournament.status} />
        </TabsContent>

        {/* ── BRACKETS ── */}
        <TabsContent value="brackets" className="space-y-4 mt-4">
          {!['IN_PROGRESS', 'COMPLETED'].includes(tournament.status) ? (
            <p className="text-sm text-muted-foreground">Le bracket sera disponible une fois le tournoi démarré.</p>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: bracketMap.size }).map((_, i) => (
                  <Button key={i} variant={currentRound === i + 1 ? 'default' : 'outline'}
                    onClick={() => setCurrentRound(i + 1)}>
                    Round {i + 1}
                  </Button>
                ))}
              </div>

              {getBracketRound.isError ? (
                <p className="text-sm text-destructive">Impossible de charger les matchs de ce round.</p>
              ) : getBracketRound.isLoading ? <TableSkeleton rows={3} cols={5} /> : currentRoundMatches.length === 0 ? (
                <p>Aucun match pour ce round.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead>Participant 1</TableHead>
                      <TableHead>Participant 2</TableHead>
                      <TableHead>Vainqueur</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRoundMatches.map((match) => {
                      const statusCfg = MATCH_STATUS_CONFIG[match.status] || { label: match.status, className: '' };
                      const StatusIcon = statusCfg.icon;
                      const winner = match.winnerId
                        ? match.participants.find((p) => p.competitorId === match.winnerId)?.competitor
                        : null;
                      return (
                        <TableRow key={match.id} className={ROW_CLASS[match.status]}>
                          <TableCell>
                            <Badge className={statusCfg.className}>
                              {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          {[0, 1].map((slot) => {
                            const p = match.participants[slot];
                            const reg = registrations.find((r) => r.competitor.id === p?.competitorId);
                            return (
                              <TableCell key={slot}>
                                {p?.competitor ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span>{p.competitor.name}</span>
                                    <div className="flex items-center gap-1">
                                      {reg?.seed && <span className="text-xs text-muted-foreground">(#{reg.seed})</span>}
                                      <CompetitorTypeBadge type={p.competitor.type} />
                                    </div>
                                  </div>
                                ) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            {winner ? (
                              <div className="flex items-center gap-1 font-semibold text-primary">
                                <Trophy className="h-4 w-4" />{winner.name}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {match.status === 'READY' && (
                              <Button variant="default" onClick={() => setSelectedMatch(match)}>
                                <Pencil className="h-4 w-4 mr-1" />Saisir résultat
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {selectedMatch && (
                <Card>
                  <CardHeader><CardTitle>Sélectionner le vainqueur</CardTitle></CardHeader>
                  <CardContent className="flex gap-4 flex-wrap">
                    {selectedMatch.participants.filter((p) => p.competitor).map((p) => {
                      const reg = registrations.find((r) => r.competitor.id === p.competitorId);
                      return (
                        <div key={p.slot} className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-1">
                            {reg?.seed && <span className="text-xs text-muted-foreground">(#{reg.seed})</span>}
                            <CompetitorTypeBadge type={p.competitor.type} />
                          </div>
                          <Button onClick={() => setPendingResult({ matchId: selectedMatch.id, winnerId: p.competitorId, winnerName: p.competitor.name })}>
                            {p.competitor.name}
                          </Button>
                        </div>
                      );
                    })}
                    <Button variant="outline" className="self-end" onClick={() => setSelectedMatch(null)}>Annuler</Button>
                  </CardContent>
                </Card>
              )}

              <AlertDialog open={!!pendingResult} onOpenChange={(open) => !open && setPendingResult(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer le résultat</AlertDialogTitle>
                    <AlertDialogDescription>
                      Déclarer <strong>{pendingResult?.winnerName}</strong> vainqueur ? Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => recordResultMutation.mutate({ matchId: pendingResult.matchId, winnerId: pendingResult.winnerId })}>
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <h2>Vue d'ensemble</h2>
              {getBracket.isError
                ? <p className="text-sm text-destructive">Impossible de charger le bracket.</p>
                : <BracketView bracketMap={bracketMap} totalRounds={bracket?.totalRounds} />
              }
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentDetail;
