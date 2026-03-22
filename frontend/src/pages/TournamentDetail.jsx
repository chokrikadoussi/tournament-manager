import {useParams} from "react-router-dom";
import {useMutation, useQuery} from "@tanstack/react-query";
import tournamentsApi from "@/api/tournaments.js";
import {queryClient} from "@/main.jsx";
import {useState} from "react";

const TournamentDetail = () => {

  const tournamentId = useParams().id;
  const [errorMsg, setErrorMsg] = useState('');

  const getTournament = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => tournamentsApi.getById(tournamentId),
  });

  const tournament = getTournament.data;

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
          <button onClick={handleStartTournament}>Démarrer le tournoi</button>
        </>
      }
      {tournament.status === 'OPEN' &&
        <>
          <button onClick={() => handleInscriptions("close")}>Cloturer les inscriptions</button>
          <button onClick={handleStartTournament}>Démarrer le tournoi</button>
        </>
      }
    </div>
  );
}

export default TournamentDetail;