import {useMutation, useQuery} from "@tanstack/react-query";
import tournamentsApi from "@/api/tournaments.js";
import {Link} from "react-router-dom";
import {useState} from "react";
import {queryClient} from "@/main.jsx";

const Tournaments = () => {

  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    maxParticipants: '',
    format: 'SINGLE_ELIM',
  });
  const clearData = () => {
    setFormData({
      name: '',
      sport: '',
      maxParticipants: '',
      format: 'SINGLE_ELIM',
    });
    setOpen(false);
  }

  const getTournaments = useQuery({
    queryKey: ['tournaments'],
    queryFn: tournamentsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (data) => tournamentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournaments']});
      clearData();
    },
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const handleCreateTournament = (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      sport: formData.sport,
      format: formData.format,
    }
    if (formData.maxParticipants) {
      payload.maxParticipants = parseInt(formData.maxParticipants);
    }
    createMutation.mutate(payload);
  }

  const tournaments = getTournaments.data?.data || [];

  if (getTournaments.isLoading) {
    return <p>Loading...</p>;
  }

  if (getTournaments.isError) {
    return <p>Error: {getTournaments.error?.message || String(getTournaments.error)}</p>;
  }

  return (
    <div>
      <h1>Tournaments</h1>
      {errorMsg && <p style={{color: 'red'}}>{errorMsg}</p>}
      <button onClick={() => setOpen(true)}>Create a tournament</button>
      {open && (
        <form onSubmit={handleCreateTournament}>
          <label>Name</label>
          <input type="text" value={formData.name}
                 onChange={(e) => setFormData({...formData, name: e.target.value})}></input>
          <label>Sport</label>
          <input type="text" value={formData.sport}
                 onChange={(e) => setFormData({...formData, sport: e.target.value})}></input>
          <label>Max participants</label>
          <input type="number" value={formData.maxParticipants}
                 onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})}></input>
          <label>Format</label>
          <select value={formData.format} onChange={(e) => setFormData({...formData, format: e.target.value})}>
            <option value="SINGLE_ELIM">Single elimination</option>
            <option value="ROUND_ROBIN">Round robin</option>
          </select>
          <button type="submit">Create</button>
          <button type="reset" onClick={() => clearData()}>Cancel</button>
        </form>
      )}
      {tournaments.length === 0 ?
        <p>No tournaments available.</p>
        :
        <ul>
          {tournaments.map((tournament) => (
            <li key={tournament.id}>
              <Link
                to={`/tournaments/${tournament.id}`}>{tournament.name}</Link> - {tournament.sport || "No sport specified"} - {tournament.status}

            </li>
          ))}
        </ul>
      }
    </div>
  );
}

export default Tournaments;
