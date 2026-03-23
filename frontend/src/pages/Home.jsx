import {Link} from 'react-router-dom';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card.jsx';
import {Trophy, Users, Plus} from 'lucide-react';
import {useQuery} from "@tanstack/react-query";
import tournamentApi from "@/api/tournaments.js";
import competitorApi from "@/api/competitors.js";
import {Skeleton} from "@/components/ui/skeleton.jsx";
import {Button} from "@/components/ui/button.jsx";

const Home = () => {

  const getTournaments = useQuery({
    queryKey: ['tournaments'],
    queryFn: tournamentApi.getAll,
    select: d => d.data,
  });

  const getCompetitors = useQuery({
    queryKey: ['competitors'],
    queryFn: competitorApi.getAll,
    select: d => d.data,
  });

  const tournaments = getTournaments?.data || [];
  const competitors = getCompetitors?.data || [];

  const activeTournaments = tournaments.filter(t => ['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(t.status)).length;
  const totalCompetitors = competitors.length;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      <div className="w-full max-w-2xl space-y-12">

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Bienvenue
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Tournament Manager</h1>
          <p className="text-muted-foreground">
            Organisez vos compétitions, gérez les participants et suivez les résultats.
          </p>
        </div>

        <section className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="text-3xl font-bold text-primary">
              {getTournaments.isLoading ?
                <Skeleton className="h-9 w-16"/>
                :
                <>
                  {activeTournaments}
                  <span className="text-xs uppercase font-normal tracking-wide text-muted-foreground pl-2">Tournois actifs</span>
                </>
              }
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-3xl font-bold text-primary">
              {getCompetitors.isLoading ?
                <Skeleton className="h-9 w-16"/>
                :
                <>
                  {totalCompetitors}
                  <span className="text-xs uppercase font-normal tracking-wide text-muted-foreground pl-2">Total compétiteurs</span>
                </>
              }
            </CardContent>
          </Card>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/tournaments" className="block group">
            <Card className="h-full transition-all hover:shadow-sm hover:border-foreground/20">
              <CardHeader className="pb-2">
                <Trophy className="w-7 h-7 mb-2 text-muted-foreground transition-colors group-hover:text-foreground"/>
                <CardTitle>Tournois</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Créez et pilotez vos tournois, générez les brackets et enregistrez les résultats.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/competitors" className="block group">
            <Card className="h-full transition-all hover:shadow-sm hover:border-foreground/20">
              <CardHeader className="pb-2">
                <Users className="w-7 h-7 mb-2 text-muted-foreground transition-colors group-hover:text-foreground"/>
                <CardTitle>Compétiteurs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Gérez vos joueurs et équipes avant de les inscrire à vos tournois.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
