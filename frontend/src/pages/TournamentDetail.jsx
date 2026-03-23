import {useParams} from "react-router-dom";
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

const TournamentDetail = () => {

  const tournamentId = useParams().id;
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState(null);
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
    queryFn: () => competitorsApi.getAll({limit: 50}),
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
      <h1>{tournament.name}</h1>
      <p>Statut : <TournamentStatusBadge status={tournament.status}/></p>
      {tournament.status === 'COMPLETED' && champion && (
        <p><strong>Champion : {champion}</strong></p>
      )}
      {tournament.status === 'DRAFT' &&
        <>
          <Button onClick={() => handleInscriptions("open")}>Ouvrir les inscriptions</Button>
          {registrations.length >= 2 &&
            <ConfirmActionDialog
              trigger={<Button>Démarrer le tournoi</Button>}
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
          <Button onClick={() => handleInscriptions("close")}>Cloturer les inscriptions</Button>
          {registrations.length >= 2 &&
            <ConfirmActionDialog
              trigger={<Button>Démarrer le tournoi</Button>}
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
              <CardTitle>Add a new competitor</CardTitle>
            </CardHeader>
            {competitorsNotInTournament.length === 0 ?
              <p>No competitors found. Please add some competitors before registering them to the tournament.</p>
              : (
                <form onSubmit={handleCompetitorRegistration}>
                  <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select a competitor'/>
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
                  <Button type="submit">Inscrire</Button>
                </form>
              )}
          </Card>
        </>
      )}
      <h2>List of Registrations</h2>
      {registrations.length === 0 ? (
        <p>No registrations found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
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
                    <Input type="number" defaultValue={reg.seed || ''}
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
          {currentRoundMatches.length === 0 ? (
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
                {currentRoundMatches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>{match.status}</TableCell>
                    <TableCell>{match.participants[0]?.competitor?.name || '-'}</TableCell>
                    <TableCell>{match.participants[1]?.competitor?.name || '-'}</TableCell>
                    <TableCell>{match.winnerId ? match.participants.find(p => p.competitorId === match.winnerId)?.competitor?.name : '-'}</TableCell>
                    <TableCell>
                      {match.status === 'READY' && (
                        <Button variant="outline" onClick={() => setSelectedMatch(match)}>Saisir résultat</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {selectedMatch && (
            <Card>
              <CardHeader>
                <CardTitle>Sélectionner le vainqueur</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                {selectedMatch.participants.filter(p => p.competitor).map(p => (
                  <Button key={p.slot} onClick={() => recordResultMutation.mutate({
                    matchId: selectedMatch.id,
                    winnerId: p.competitorId
                  })}>
                    {p.competitor.name}
                  </Button>
                ))}
                <Button variant="outline" onClick={() => setSelectedMatch(null)}>Annuler</Button>
              </CardContent>
            </Card>
          )}
          <h2>Vue d'ensemble</h2>
          <div className="flex gap-8 overflow-x-auto">
            {[...bracketMap.entries()].map(([round, matches]) => (
              <div key={round} className="flex flex-col gap-2">
                <h3 className="font-semibold">Round {round}</h3>
                {matches.map((match) => (
                  <Card key={match.id} className="w-48">
                    <CardContent className="p-3 flex flex-col gap-1">
                      {[0, 1].map((slot) => {
                        const p = match.participants[slot];
                        const name = p?.competitor?.name ?? (p ? 'BYE' : 'TBD');
                        return (
                          <div
                            key={slot}
                            className={match.winnerId === p?.competitorId ? 'font-bold' : 'text-muted-foreground'}
                          >
                            {name}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default TournamentDetail;
