import {useQuery} from "@tanstack/react-query";
import competitorsApi from "@/api/competitors.js";

const Competitors = () => {

  const getCompetitors = useQuery({
    queryKey: ['competitors'],
    queryFn: competitorsApi.getAll,
  });

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
