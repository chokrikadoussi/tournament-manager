import {useParams} from "react-router-dom";
import {useMutation, useQuery} from "@tanstack/react-query";
import tournamentsApi from "@/api/tournaments.js";
import registrationsApi from "@/api/registrations.js";
import {queryClient} from "@/main.jsx";
import {useState} from "react";

const TournamentDetail = () => {

  const tournamentId = useParams().id;
  const [errorMsg, setErrorMsg] = useState('');

  const getTournament = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => tournamentsApi.getById(tournamentId),
  });

  const getRegistrations = useQuery({
    queryKey: ['tournament', tournamentId, 'registrations'],
    queryFn: () => registrationsApi.getAll(tournamentId),
  });

  const tournament = getTournament.data;
  const registrations = getRegistrations.data || [];

  const competitorLabel = {
    'PLAYER': 'Joueur',
    'TEAM': 'Équipe',
  }

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
          </tr>
          </thead>
          <tbody>
          {registrations.map((reg) => (
            <tr key={reg.id}>
              <td>{reg.competitor.name}</td>
              <td>{competitorLabel[reg.competitor.type]}</td>
              <td>{reg.seed || "Non classé"}</td>
              <td>{reg.createdAt}</td>
            </tr>
          ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TournamentDetail;
