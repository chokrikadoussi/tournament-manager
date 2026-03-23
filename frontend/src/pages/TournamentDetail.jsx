import {useParams} from "react-router-dom";
import {useMutation, useQuery} from "@tanstack/react-query";
import tournamentsApi from "@/api/tournaments.js";
import registrationsApi from "@/api/registrations.js";
import competitorsApi from "@/api/competitors.js";
import bracketApi from "@/api/bracket.js";
import matchesApi from "@/api/matches.js";
import {queryClient} from "@/main.jsx";
import {useState} from "react";

const TournamentDetail = () => {

  const tournamentId = useParams().id;
  const [errorMsg, setErrorMsg] = useState('');
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState(null);

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

  const competitorLabel = {
    'PLAYER': 'Joueur',
    'TEAM': 'Équipe',
  }

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
    }
  });

  const closeInscriptionsMutation = useMutation({
    mutationFn: (id) => tournamentsApi.closeInscriptions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
    },
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const startTournamentMutation = useMutation({
    mutationFn: (id) => tournamentsApi.startTournament(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
    },
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const registerMutation = useMutation({
    mutationFn: ({tournamentId, competitorId}) => registrationsApi.register(tournamentId, competitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId, 'registrations']});
    },
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const unregisterMutation = useMutation({
    mutationFn: ({tournamentId, competitorId}) => registrationsApi.unregister(tournamentId, competitorId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId, 'registrations']});
    },
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const recordResultMutation = useMutation({
    mutationFn: ({matchId, winnerId}) => matchesApi.recordResult(tournamentId, matchId, winnerId),
    onSuccess: () => {
      setSelectedMatch(null);
      queryClient.invalidateQueries({queryKey: ['matches', tournamentId, currentRound]});
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId, 'bracket']});
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
    },
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const setSeedMutation = useMutation({
    mutationFn: ({competitorId, seed}) =>
      registrationsApi.setSeed(tournamentId, competitorId, seed),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ['tournament', tournamentId, 'registrations']
    }),
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  // ---------
  // HANDLERS
  // ---------
  const handleInscriptions = (action) => {
    if (window.confirm(`Are you sure you want to ${action} inscriptions?`)) {
      if (action === 'open') {
        openInscriptionsMutation.mutate(tournamentId);
      } else if (action === 'close') {
        closeInscriptionsMutation.mutate(tournamentId);
      }
    }
  }

  const handleStartTournament = () => {
    if (window.confirm(`Starting the tournament will generate the bracket and you won't be able to add more competitors. Are you sure?`)) {
      startTournamentMutation.mutate(tournamentId);
    }
  }

  const handleCompetitorRegistration = (e) => {
    e.preventDefault();
    const competitorId = e.target.elements["competitorId"].value;
    registerMutation.mutate({tournamentId, competitorId});
  }

  const handleCompetitorUnregister = (competitor) => {
    if (window.confirm(`Are you sure you want to unregister ${competitor.name} from this tournament?`)) {
      unregisterMutation.mutate({tournamentId, competitorId: competitor.id});
    }
  }

  const handleSeedChange = (e, competitorId) => {
    const val = e.target.value;
    setSeedMutation.mutate({
      competitorId,
      seed: val ? parseInt(val) : null,
    });
  }

  if (getTournament.isLoading) {
    return <p>Loading...</p>;
  }

  if (getTournament.isError) {
    return <p>Error: {getTournament.error?.message || String(getTournament.error)}</p>;
  }

  return (
    <div className="tournament-detail">
      <h1>{tournament.name}</h1>
      {errorMsg && <p style={{color: 'red'}}>{errorMsg}</p>}
      <p>Statut : {tournament.status}</p>
      {tournament.status === 'COMPLETED' && champion && (
        <p><strong>Champion : {champion}</strong></p>
      )}
      {tournament.status === 'DRAFT' &&
        <>
          <button onClick={() => handleInscriptions("open")}>Ouvrir les inscriptions</button>
          {registrations.length >= 2 && <button onClick={handleStartTournament}>Démarrer le tournoi</button>}
        </>
      }
      {tournament.status === 'OPEN' &&
        <>
          <button onClick={() => handleInscriptions("close")}>Cloturer les inscriptions</button>
          {registrations.length >= 2 && <button onClick={handleStartTournament}>Démarrer le tournoi</button>}
        </>
      }
      {['DRAFT', 'OPEN'].includes(tournament.status) && (
        <>
          <h2>Add a new competitor</h2>
          {competitorsNotInTournament.length === 0 ?
            <p>No competitors found. Please add some competitors before registering them to the tournament.</p>
            : (
              <form onSubmit={handleCompetitorRegistration}>
                <select name="competitorId">
                  {competitorsNotInTournament.map((competitor) => (
                    <option key={competitor.id}
                            value={competitor.id}>{competitor.name} ({competitorLabel[competitor.type]})</option>
                  ))}
                </select>
                <button type="submit">Inscrire</button>
              </form>
            )}
        </>
      )}
      <h2>List of Registrations</h2>
      {registrations.length === 0 ? (
        <p>No registrations found.</p>
      ) : (
        <table>
          <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Seed</th>
            <th>Enregistré le</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
          {registrations.map((reg) => (
              <tr key={reg.id}>
                <td>{reg.competitor.name}</td>
                <td>{competitorLabel[reg.competitor.type]}</td>
                <td>
                  <input
                    type="number"
                    defaultValue={reg.seed || ''}
                    onBlur={(e) => handleSeedChange(e, reg.competitor.id)}
                  />
                </td>
                <td>{reg.createdAt}</td>
                <td>
                  {['DRAFT', 'OPEN'].includes(tournament.status) && (
                    <button onClick={() => handleCompetitorUnregister(reg.competitor)}>Désinscrire</button>
                  )}
                </td>
              </tr>
            )
          )}
          </tbody>
        </table>
      )}
      <h2>Visual</h2>
      {Array.from({length: bracketMap.size}).map((_, i) => (
        <button key={i} onClick={() => setCurrentRound(i + 1)}
                style={{fontWeight: currentRound === i + 1 ? 'bold' : 'normal'}}>
          Round {i + 1}
        </button>
      ))}
      {currentRoundMatches.length === 0 ? (
        <p>No matches for this round.</p>
      ) : (
        <table>
          <thead>
          <tr>
            <th>Status</th>
            <th>Participant 1</th>
            <th>Participant 2</th>
            <th>Winner</th>
            <th>Actions</th>
          </tr>
          </thead>
          <tbody>
          {currentRoundMatches.map((match) => (
            <tr key={match.id}>
              <td>{match.status}</td>
              <td>{match.participants[0]?.competitor?.name || '-'}</td>
              <td>{match.participants[1]?.competitor?.name || '-'}</td>
              <td>{match.winnerId ? match.participants.find(p => p.competitorId === match.winnerId)?.competitor?.name : '-'}</td>
              <td>
                {match.status === 'READY' && (
                  <button onClick={() => setSelectedMatch(match)}>Saisir résultat</button>
                )}
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
      {selectedMatch && (
        <div>
          <p>Sélectionner le vainqueur :</p>
          {selectedMatch.participants.filter(p => p.competitor).map(p => (
            <button key={p.slot} onClick={() => recordResultMutation.mutate({matchId: selectedMatch.id, winnerId: p.competitorId})}>
              {p.competitor.name}
            </button>
          ))}
          <button onClick={() => setSelectedMatch(null)}>Annuler</button>
        </div>
      )}
      <h2>Every round</h2>
      <div style={{display: 'flex', gap: '2rem'}}>
        {[...bracketMap.entries()].map(([round, matches]) => (
          <div key={round}>
            <h3>Round {round}</h3>
            {matches.map((match) => (
              <div key={match.id} style={{border: '1px solid black', margin: '0.5rem', padding: '0.5rem'}}>
                {match.participants.map((p) => (
                  <div key={p.slot}
                       style={{fontWeight: match.winnerId === p.competitorId ? 'bold' : 'normal'}}>
                    {p.competitor?.name ?? 'BYE'}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TournamentDetail;
