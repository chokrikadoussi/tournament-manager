import {useQuery} from "@tanstack/react-query";
import tournamentsApi from "@/api/tournaments.js";
import {Link} from "react-router-dom";

const Tournaments = () => {

  const getTournaments = useQuery({
    queryKey: ['tournaments'],
    queryFn: tournamentsApi.getAll,
  })

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
