import {useMutation, useQuery} from "@tanstack/react-query";
import { queryClient } from "@/main.jsx";
import competitorsApi from "@/api/competitors.js";
import {useState} from "react";

const Competitors = () => {

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'PLAYER',
  });
  const clearData = () => {
    setFormData({ name: '', type: 'PLAYER' });
    setOpen(false);
  }

  const getCompetitors = useQuery({
    queryKey: ['competitors'],
    queryFn: competitorsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data) => competitorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      clearData();
    },
  });

  const handleCreateCompetitor = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  }

  const competitors = getCompetitors.data?.data || [];

  if (getCompetitors.isLoading) {
    return <p>Loading...</p>;
  }

  if (getCompetitors.isError) {
    return <p>Error: {getCompetitors.error?.message || String(getCompetitors.error)}</p>;
  }

  const competitorLabel = {
    'PLAYER': 'Joueur',
    'TEAM': 'Équipe',
  }

  return (
    <div>
      <h1>Competitors</h1>
      <button onClick={() => setOpen(true)}>Add a competitor</button>
      {open && (
        <form onSubmit={handleCreateCompetitor}>
          <div>
            <label htmlFor="fullname">Name</label>
            <input type="text" name="fullname" id="fullname" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}></input>
            <label htmlFor="type">Type</label>
            <select name="type" id="type" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
              <option value="PLAYER">Joueur</option>
              <option value="TEAM">Equipe</option>
            </select>
            <button type="submit">Créer</button>
            <button type="reset" onClick={() => clearData()}>Annuler</button>
          </div>
        </form>
      )}
      {competitors.length === 0 ? (
        <p>No competitors found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Créé le</th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((competitor) => (
              <tr key={competitor.id}>
                <td>{competitor.name}</td>
                <td>{competitorLabel[competitor.type]}</td>
                <td>{competitor.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Competitors;
