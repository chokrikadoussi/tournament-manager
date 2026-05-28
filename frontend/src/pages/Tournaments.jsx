import { useMutation, useQuery } from '@tanstack/react-query';
import tournamentsApi from '@/api/tournaments.js';
import { Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { queryClient } from '@/main.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import {
  Dialog, DialogClose, DialogContent, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Field, FieldGroup } from '@/components/ui/field.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import TournamentStatusBadge from '@/components/TournamentStatusBadge.jsx';
import { Calendar, Users, Trophy, Search, X, Plus } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.jsx';
import { toastError, toastSuccess } from '@/lib/toast.js';

const STATUS_LABELS = {
  ALL:         'Tous',
  DRAFT:       'Brouillon',
  OPEN:        'Inscriptions',
  IN_PROGRESS: 'En cours',
  COMPLETED:   'Terminé',
  CANCELLED:   'Annulé',
};

const STATUS_PRIORITY = { IN_PROGRESS: 0, OPEN: 1, DRAFT: 2, COMPLETED: 3, CANCELLED: 4 };

const sortTournaments = (list) =>
  [...list].sort(
    (a, b) =>
      (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9) ||
      new Date(b.createdAt) - new Date(a.createdAt),
  );

const Tournaments = () => {
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '', sport: '', maxParticipants: '', format: 'SINGLE_ELIM',
  });
  const [searchParams, setSearchParams] = useSearchParams();

  // Ouvre automatiquement la modale si ?new=1 (ex: bouton nav)
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  const clearData = () => {
    setFormData({ name: '', sport: '', maxParticipants: '', format: 'SINGLE_ELIM' });
    setOpen(false);
  };

  const getTournaments = useQuery({
    queryKey: ['tournaments'],
    queryFn: tournamentsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data) => tournamentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toastSuccess('Tournoi créé avec succès');
      clearData();
    },
    onError: (error) => {
      toastError(error.error || 'Une erreur est survenue lors de la création du tournoi');
    },
  });

  const handleCreateTournament = (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const sport = formData.sport.trim();
    if (!name) return;
    const payload = { name, sport: sport || undefined, format: formData.format };
    if (formData.maxParticipants) payload.maxParticipants = parseInt(formData.maxParticipants);
    createMutation.mutate(payload);
  };

  const allTournaments = getTournaments.data?.data || [];

  const statusCounts = allTournaments.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  const q = search.trim().toLowerCase();
  const tournaments = sortTournaments(
    allTournaments
      .filter((t) => statusFilter === 'ALL' || t.status === statusFilter)
      .filter((t) => !q || t.name.toLowerCase().includes(q) || t.sport?.toLowerCase().includes(q)),
  );

  const hasActiveFilter = statusFilter !== 'ALL' || q !== '';

  const resetFilters = () => { setStatusFilter('ALL'); setSearch(''); };

  if (getTournaments.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (getTournaments.isError) {
    return <p className="text-sm text-destructive">Impossible de charger les tournois.</p>;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Tournois</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Créer un tournoi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateTournament}>
              <DialogHeader>
                <DialogTitle>Créer un nouveau tournoi</DialogTitle>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name" name="name" placeholder="Open de …"
                    value={formData.name} maxLength={100} required
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </Field>
                <Field>
                  <Label htmlFor="sport">Sport</Label>
                  <Input
                    id="sport" name="sport" placeholder="Boxe anglaise"
                    value={formData.sport} maxLength={100}
                    onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                  />
                </Field>
                <Field>
                  <Label htmlFor="maxparticipant">Nombre max de participants</Label>
                  <Input
                    id="maxparticipant" name="maxparticipant" type="number" placeholder="150"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                  />
                </Field>
                <Field>
                  <Label htmlFor="format">Type</Label>
                  <Select value={formData.format} onValueChange={(v) => setFormData({ ...formData, format: v })}>
                    <SelectTrigger id="format"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE_ELIM">Élimination directe</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="reset" onClick={clearData}>Annuler</Button>
                </DialogClose>
                <Button type="submit" disabled={createMutation.isPending}>Créer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Barre de recherche + filtres ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher par nom ou sport…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Filtres statut */}
          <ToggleGroup
            type="single"
            variant="outline"
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v || 'ALL')}
            className="flex-wrap justify-start"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => {
              const count = value === 'ALL' ? allTournaments.length : (statusCounts[value] ?? 0);
              return (
                <ToggleGroupItem key={value} value={value} className="text-xs gap-1.5">
                  {label}
                  {count > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums leading-none">
                      {count}
                    </span>
                  )}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>

        {/* Résultat + reset */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {tournaments.length === 0
              ? 'Aucun tournoi trouvé'
              : `${tournaments.length} tournoi${tournaments.length > 1 ? 's' : ''}`}
          </span>
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* ── Grille / état vide ── */}
      {tournaments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground border rounded-lg">
          <Trophy className="h-10 w-10" aria-hidden="true" />
          {hasActiveFilter ? (
            <>
              <p>Aucun tournoi ne correspond à vos filtres.</p>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            </>
          ) : (
            <>
              <p>Aucun tournoi créé pour le moment.</p>
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                Créer un tournoi
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <Link key={t.id} to={`/tournaments/${t.id}`} className="block group">
              <Card className="h-full hover:shadow-md transition-all cursor-pointer group-hover:border-primary/30">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold leading-snug">
                      {t.name}
                    </CardTitle>
                    <TournamentStatusBadge status={t.status} />
                  </div>
                  {t.sport && (
                    <p className="text-sm text-muted-foreground">{t.sport}</p>
                  )}
                </CardHeader>
                <CardContent className="flex items-center gap-4 pt-0 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {t._count?.registrations ?? 0} inscrit{(t._count?.registrations ?? 0) !== 1 ? 's' : ''}
                  </span>
                  {t.maxParticipants && (
                    <span className="text-muted-foreground/60">/ {t.maxParticipants} max</span>
                  )}
                  <span className="flex items-center gap-1 ml-auto">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tournaments;
