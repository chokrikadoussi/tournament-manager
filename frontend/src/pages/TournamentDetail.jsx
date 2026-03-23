import {useParams, Link} from "react-router-dom";
import {useMutation, useQuery} from "@tanstack/react-query";
import tournamentsApi from "@/api/tournaments.js";
import registrationsApi from "@/api/registrations.js";
import competitorsApi from "@/api/competitors.js";
import bracketApi from "@/api/bracket.js";
import matchesApi from "@/api/matches.js";
import {queryClient} from "@/main.jsx";
import {useState} from "react";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.jsx";
import ConfirmActionDialog from "@/components/ConfirmActionDialog.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Input} from "@/components/ui/input.jsx";
import TableSkeleton from "@/components/TableSkeleton.jsx";
import CompetitorTypeBadge from "@/components/CompetitorTypeBadge.jsx";
import TournamentStatusBadge from "@/components/TournamentStatusBadge.jsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.jsx";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.jsx";
import {toastSuccess, toastError} from "@/lib/toast.js";
import BracketView from "@/components/BracketView.jsx";
import {Badge} from "@/components/ui/badge.jsx";
import {Check, Trophy, Pencil} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator
} from "@/components/ui/breadcrumb.jsx";

const MATCH_STATUS_CONFIG = {
  PENDING: {label: 'En attente', className: 'bg-muted text-muted-foreground hover:bg-muted'},
  READY: {
    label: 'Prêt',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
  },
  BYE: {label: 'Bye', className: 'bg-muted text-muted-foreground hover:bg-muted'},
  COMPLETED: {
    label: 'Terminé',
    className: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    icon: Check
  },
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
  const [pendingResult, setPendingResult] = useState(null); // { matchId, winnerId, winnerName }
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('');

  const getTournament = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => tournamentsApi.getById(tournamentId),
  });

  const tournament = getTournament.data;

  const getRegistrations = useQuery({
    queryKey: ['tournament', tournamentId, 'registrations'],
    queryFn: () => registrationsApi.getAll(tournamentId),
  });

  const getCompetitors = useQuery({
    queryKey: ['competitors'],
    queryFn: () => competitorsApi.getAll({limit: 100}),
  });

  const getBracket = useQuery({
    queryKey: ['tournament', tournamentId, 'bracket'],
    queryFn: () => bracketApi.getBracket(tournamentId),
    enabled: ["IN_PROGRESS", "COMPLETED"].includes(tournament?.status),
  });

  const getBracketRound = useQuery({
    queryKey: ['matches', tournamentId, currentRound],
    queryFn: () => matchesApi.getByTournament(tournamentId, currentRound),
    enabled: ["IN_PROGRESS", "COMPLETED"].includes(tournament?.status),
  })

  const registrations = getRegistrations.data || [];
  const competitors = getCompetitors.data?.data || [];
  const competitorsNotInTournament = competitors.filter(c => !registrations.some(r => r.competitor.id === c.id));
  const bracket = ["IN_PROGRESS", "COMPLETED"].includes(tournament?.status) ? getBracket.data : null;
  const currentRoundMatches = getBracketRound.data || [];

  const bracketMap = new Map(); // Map<round: number, matches: array>
  if (bracket?.rounds) {
    bracket.rounds.forEach(({round, matches}) => {
      bracketMap.set(round, matches);
    });
  }

  const finalMatch = bracket ? bracketMap.get(bracket.totalRounds)?.[0] : null;
  const champion = finalMatch?.winnerId
    ? registrations.find(r => r.competitor.id === finalMatch.winnerId)?.competitor?.name
    : null;

  // ---------
  // MUTATIONS
  // ---------
  const openInscriptionsMutation = useMutation({
    mutationFn: (id) => tournamentsApi.openInscriptions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
      toastSuccess("Inscriptions ouvertes");
    },
    onError: (error) => {
      toastError(error.error || 'Une erreur est survenue lors de l\'ouverture des inscriptions');
    }
  });

  const closeInscriptionsMutation = useMutation({
    mutationFn: (id) => tournamentsApi.closeInscriptions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
      toastSuccess("Inscriptions clôturées");
    },
    onError: (error) => {
      toastError(error.error || 'Une erreur est survenue lors de la clôture des inscriptions');
    }
  });

  const startTournamentMutation = useMutation({
    mutationFn: (id) => tournamentsApi.startTournament(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
      toastSuccess("Tournoi démarré");
    },
    onError: (error) => {
      toastError(error.error || 'Une erreur est survenue lors du démarrage du tournoi');
    }
  });

  const registerMutation = useMutation({
    mutationFn: ({tournamentId, competitorId}) => registrationsApi.register(tournamentId, competitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId, 'registrations']});
      setSelectedCompetitorId('');
      toastSuccess("Compétiteur inscrit");
    },
    onError: (error) => {
      toastError(error.error || 'Une erreur est survenue lors de l\'inscription du compétiteur');
    }
  });

  const unregisterMutation = useMutation({
    mutationFn: ({tournamentId, competitorId}) => registrationsApi.unregister(tournamentId, competitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId, 'registrations']});
      toastSuccess("Compétiteur désinscrit");
    },
    onError: (error) => {
      toastError(error.error || 'Une erreur est survenue lors de la désinscription du compétiteur');
    }
  });

  const recordResultMutation = useMutation({
    mutationFn: ({matchId, winnerId}) => matchesApi.recordResult(tournamentId, matchId, winnerId),
    onSuccess: () => {
      setSelectedMatch(null);
      setPendingResult(null);
      queryClient.invalidateQueries({queryKey: ['matches', tournamentId, currentRound]});
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId, 'bracket']});
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
      toastSuccess("Résultat enregistré");
    },
    onError: (error) => {
      toastError(error.error || 'Une erreur est survenue lors de l\'enregistrement du résultat');
    }
  });

  const setSeedMutation = useMutation({
    mutationFn: ({competitorId, seed}) =>
      registrationsApi.setSeed(tournamentId, competitorId, seed),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId, 'registrations']});
      toastSuccess("Classement mis à jour");
    },
    onError: (error) => {
      toastError(error.error || 'Une erreur est survenue lors de la mise à jour du classement');
    }
  });

  // ---------
  // HANDLERS
  // ---------
  const handleInscriptions = (action) => {
    if (action === 'open') {
      openInscriptionsMutation.mutate(tournamentId);
    } else if (action === 'close') {
      closeInscriptionsMutation.mutate(tournamentId);
    }
  }

  const handleStartTournament = () => {
    startTournamentMutation.mutate(tournamentId);
  }

  const handleCompetitorRegistration = (e) => {
    e.preventDefault();
    registerMutation.mutate({tournamentId, competitorId: selectedCompetitorId});
  }

  const handleCompetitorUnregister = (competitor) => {
    unregisterMutation.mutate({tournamentId, competitorId: competitor.id});
  }

  const handleSeedChange = (e, competitorId) => {
    const val = e.target.value;
    setSeedMutation.mutate({
      competitorId,
      seed: val ? parseInt(val) : null,
    });
  }

  if (getTournament.isLoading) {
    return <TableSkeleton cols={5}/>;
  }

  if (getTournament.isError) {
    return <p>Error: {getTournament.error?.message || String(getTournament.error)}</p>;
  }

  return (
    <div className="tournament-detail">
      {tournament && <Breadcrumb className="text-sm text-muted-foreground mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Accueil</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator/>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/tournaments">Tournois</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator/>
          <BreadcrumbItem>
            <BreadcrumbPage>{tournament.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>}

      <div className="flex items-center gap-3">
        <h1>{tournament.name}</h1>
        <TournamentStatusBadge status={tournament.status}/>
      </div>
      {tournament.status === 'COMPLETED' && champion && (
        <Card className="border-primary/30 bg-primary/5 my-4">
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="h-8 w-8 text-primary shrink-0"/>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Champion</p>
              <p className="text-xl font-bold text-primary">{champion}</p>
            </div>
          </CardContent>
        </Card>
      )}
      {tournament.status === 'DRAFT' &&
        <>
          <Button onClick={() => handleInscriptions("open")} disabled={openInscriptionsMutation.isPending}>
            Ouvrir les inscriptions
          </Button>
          {registrations.length >= 2 &&
            <ConfirmActionDialog
              trigger={<Button disabled={startTournamentMutation.isPending}>Démarrer le tournoi</Button>}
              title="Démarrer le tournoi ?"
              description="Le bracket sera généré et les inscriptions seront clôturées. Cette action est irréversible."
              confirmLabel="Démarrer"
              onConfirm={handleStartTournament}
            />
          }
        </>
      }
      {tournament.status === 'OPEN' &&
        <>
          <Button onClick={() => handleInscriptions("close")} disabled={closeInscriptionsMutation.isPending}>
            Cloturer les inscriptions
          </Button>
          {registrations.length >= 2 &&
            <ConfirmActionDialog
              trigger={<Button disabled={startTournamentMutation.isPending}>Démarrer le tournoi</Button>}
              title="Démarrer le tournoi ?"
              description="Le bracket sera généré et les inscriptions seront clôturées. Cette action est irréversible."
              confirmLabel="Démarrer"
              onConfirm={handleStartTournament}
            />
          }
        </>
      }
      {tournament.status === 'OPEN' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Inscrire un combattant</CardTitle>
            </CardHeader>
            {competitorsNotInTournament.length === 0 ?
              <p>Aucun combattant disponible. Ajoutez des compétiteurs avant de les inscrire au tournoi.</p>
              : (
                <form onSubmit={handleCompetitorRegistration}>
                  <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                    <SelectTrigger>
                      <SelectValue placeholder='Choisir un combattant...'/>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Joueur</SelectLabel>
                        {competitorsNotInTournament.filter((c) => c.type === 'PLAYER').map((competitor) => (
                          <SelectItem key={competitor.id} value={competitor.id}>{competitor.name}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Equipe</SelectLabel>
                        {competitorsNotInTournament.filter((c) => c.type === 'TEAM').map((competitor) => (
                          <SelectItem key={competitor.id} value={competitor.id}>{competitor.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={!selectedCompetitorId}>Inscrire</Button>
                </form>
              )}
          </Card>
        </>
      )}
      <h2>Liste des compétiteurs inscrits</h2>
      {getRegistrations.isLoading ? <TableSkeleton rows={3} cols={5}/> : registrations.length === 0 ? (
        <p>Aucune inscription trouvée.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Classement</TableHead>
              <TableHead>Enregistré le</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell>{reg.competitor.name}</TableCell>
                  <TableCell><CompetitorTypeBadge type={reg.competitor.type}/></TableCell>
                  <TableCell>
                    <Input key={reg.id + '-' + (reg.seed ?? 'null')} type="number" defaultValue={reg.seed || ''}
                           onBlur={(e) => handleSeedChange(e, reg.competitor.id)}/>
                  </TableCell>
                  <TableCell>{reg.createdAt}</TableCell>
                  <TableCell>
                    {tournament.status === 'OPEN' &&
                      <ConfirmActionDialog
                        trigger={<Button variant="destructive">Désinscrire</Button>}
                        title="Désinscrire le compétiteur ?"
                        description="Cette action est irréversible et supprimera les données d'inscription associées."
                        confirmLabel="Désinscrire"
                        confirmVariant="destructive"
                        onConfirm={() => handleCompetitorUnregister(reg.competitor)}
                      />}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      )}
      {['IN_PROGRESS', 'COMPLETED'].includes(tournament.status) && (
        <>
          <h2>Matchs par round</h2>
          <div className="flex gap-2">
            {Array.from({length: bracketMap.size}).map((_, i) => (
              <Button
                key={i}
                variant={currentRound === i + 1 ? 'default' : 'outline'}
                onClick={() => setCurrentRound(i + 1)}
              >
                Round {i + 1}
              </Button>
            ))}
          </div>
          {getBracketRound.isError ? (
            <p className="text-sm text-destructive">Impossible de charger les matchs de ce round.</p>
          ) : getBracketRound.isLoading ? <TableSkeleton rows={3} cols={5}/> : currentRoundMatches.length === 0 ? (
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
                  const statusCfg = MATCH_STATUS_CONFIG[match.status] || {label: match.status, className: ''};
                  const StatusIcon = statusCfg.icon;
                  const winner = match.winnerId
                    ? match.participants.find(p => p.competitorId === match.winnerId)?.competitor
                    : null;
                  return (
                    <TableRow key={match.id} className={ROW_CLASS[match.status]}>
                      <TableCell>
                        <Badge className={statusCfg.className}>
                          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1"/>}
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      {[0, 1].map((slot) => {
                        const p = match.participants[slot];
                        const reg = registrations.find(r => r.competitor.id === p?.competitorId);
                        return (
                          <TableCell key={slot}>
                            {p?.competitor ? (
                              <div className="flex flex-col gap-0.5">
                                <span>{p.competitor.name}</span>
                                <div className="flex items-center gap-1">
                                  {reg?.seed && <span className="text-xs text-muted-foreground">(#{reg.seed})</span>}
                                  <CompetitorTypeBadge type={p.competitor.type}/>
                                </div>
                              </div>
                            ) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        {winner ? (
                          <div className="flex items-center gap-1 font-semibold text-primary">
                            <Trophy className="h-4 w-4"/>
                            {winner.name}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {match.status === 'READY' && (
                          <Button variant="default" onClick={() => setSelectedMatch(match)}>
                            <Pencil className="h-4 w-4 mr-1"/>
                            Saisir résultat
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
              <CardHeader>
                <CardTitle>Sélectionner le vainqueur</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4 flex-wrap">
                {selectedMatch.participants.filter(p => p.competitor).map(p => {
                  const reg = registrations.find(r => r.competitor.id === p.competitorId);
                  return (
                    <div key={p.slot} className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        {reg?.seed && <span className="text-xs text-muted-foreground">(#{reg.seed})</span>}
                        <CompetitorTypeBadge type={p.competitor.type}/>
                      </div>
                      <Button onClick={() => setPendingResult({
                        matchId: selectedMatch.id,
                        winnerId: p.competitorId,
                        winnerName: p.competitor.name,
                      })}>
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
                <AlertDialogAction onClick={() => recordResultMutation.mutate({
                  matchId: pendingResult.matchId,
                  winnerId: pendingResult.winnerId,
                })}>
                  Confirmer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <h2>Vue d'ensemble</h2>
          {getBracket.isError
            ? <p className="text-sm text-destructive">Impossible de charger le bracket.</p>
            : <BracketView bracketMap={bracketMap} totalRounds={bracket?.totalRounds}/>
          }
        </>
      )}
    </div>
  );
}

export default TournamentDetail;
