import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Trophy, Plus, Users, Calendar, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import tournamentApi from '@/api/tournaments.js';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Button } from '@/components/ui/button.jsx';
import TournamentStatusBadge from '@/components/TournamentStatusBadge.jsx';

const STATUS_PRIORITY = { IN_PROGRESS: 0, OPEN: 1, DRAFT: 2 };

const TournamentCard = ({ t, compact = false }) => (
  <Link to={`/tournaments/${t.id}`} className="block group">
    <Card className={`h-full transition-all cursor-pointer group-hover:border-primary/30 hover:shadow-md ${compact ? 'opacity-70 hover:opacity-100' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={`leading-snug ${compact ? 'text-sm font-medium' : 'text-base font-semibold'}`}>
            {t.name}
          </CardTitle>
          <TournamentStatusBadge status={t.status} />
        </div>
        {t.sport && (
          <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{t.sport}</p>
        )}
      </CardHeader>
      <CardContent className="flex items-center gap-3 pt-0 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {t._count?.registrations ?? 0} inscrit{(t._count?.registrations ?? 0) !== 1 ? 's' : ''}
        </span>
        {t.maxParticipants && (
          <span className="text-muted-foreground/50">/ {t.maxParticipants} max</span>
        )}
        {compact && (
          <span className="flex items-center gap-1 ml-auto">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(t.createdAt).toLocaleDateString('fr-FR')}
          </span>
        )}
        {!compact && (
          <ArrowRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-60 transition-opacity" />
        )}
      </CardContent>
    </Card>
  </Link>
);

const CardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/3 mt-1" />
    </CardHeader>
    <CardContent className="pt-0">
      <Skeleton className="h-3 w-1/2" />
    </CardContent>
  </Card>
);

const Home = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: tournamentApi.getAll,
    select: (d) => d.data,
  });

  const tournaments = data || [];

  const active = [...tournaments]
    .filter((t) => ['IN_PROGRESS', 'OPEN', 'DRAFT'].includes(t.status))
    .sort((a, b) => (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9));

  const recentCompleted = [...tournaments]
    .filter((t) => t.status === 'COMPLETED')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 2);

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          {!isLoading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {active.length > 0
                ? `${active.length} tournoi${active.length > 1 ? 's' : ''} actif${active.length > 1 ? 's' : ''}`
                : 'Aucun tournoi actif en ce moment'}
            </p>
          )}
        </div>
        <Button asChild>
          <Link to="/tournaments?new=1">
            <Plus className="h-4 w-4 mr-1.5" />
            Nouveau tournoi
          </Link>
        </Button>
      </div>

      {/* ── Tournois actifs ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 border rounded-lg text-muted-foreground">
          <Trophy className="h-10 w-10" aria-hidden="true" />
          <div className="text-center space-y-1">
            <p className="font-medium text-foreground">Aucun tournoi actif</p>
            <p className="text-sm">Créez votre premier tournoi pour commencer.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/tournaments?new=1">
              <Plus className="h-4 w-4 mr-1.5" />
              Créer un tournoi
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((t) => <TournamentCard key={t.id} t={t} />)}
        </div>
      )}

      {/* ── Récemment terminés ── */}
      {recentCompleted.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Récemment terminés
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentCompleted.map((t) => <TournamentCard key={t.id} t={t} compact />)}
          </div>
        </div>
      )}

      {/* ── Lien vers la liste complète ── */}
      {tournaments.length > 0 && (
        <div className="flex justify-end">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link to="/tournaments">
              Voir tous les tournois
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}

    </div>
  );
};

export default Home;
