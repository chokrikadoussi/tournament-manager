import {useMutation, useQuery} from '@tanstack/react-query';
import {queryClient} from '@/main.jsx';
import {useState, useEffect} from 'react';
import registrationsApi from '@/api/registrations.js';
import categoriesApi from '@/api/categories.js';
import competitorsApi from '@/api/competitors.js';
import {Button} from '@/components/ui/button.jsx';
import {Input} from '@/components/ui/input.jsx';
import {Badge} from '@/components/ui/badge.jsx';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select.jsx';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card.jsx';
import {toastSuccess, toastError} from '@/lib/toast.js';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.jsx';
import CompetitorTypeBadge from '@/components/CompetitorTypeBadge.jsx';
import TableSkeleton from '@/components/TableSkeleton.jsx';
import {Users} from 'lucide-react';

const GENDER_LABELS = {MALE: 'M', FEMALE: 'F', MIXED: 'MX'};

const WaitlistBadge = () => (
  <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Liste d'attente</Badge>
);

const InscriptionsTab = ({tournamentId, tournamentStatus}) => {
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('');
  const [competitorSearch, setCompetitorSearch] = useState('');
  const [debouncedCompetitorSearch, setDebouncedCompetitorSearch] = useState('');

  const canRegister = tournamentStatus === 'OPEN';
  const canUnregister = tournamentStatus === 'OPEN';
  const canAssign = ['DRAFT', 'OPEN'].includes(tournamentStatus);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCompetitorSearch(competitorSearch), 300);
    return () => clearTimeout(t);
  }, [competitorSearch]);

  const handleCompetitorSearchChange = (e) => {
    setCompetitorSearch(e.target.value);
    setSelectedCompetitorId('');
  };

  const invalidateRegs = () =>
    queryClient.invalidateQueries({queryKey: ['tournament', tournamentId, 'registrations']});

  const {data: registrations = [], isLoading, isError} = useQuery({
    queryKey: ['tournament', tournamentId, 'registrations'],
    queryFn: () => registrationsApi.getAll(tournamentId),
  });

  const {data: categoriesData = []} = useQuery({
    queryKey: ['tournament', tournamentId, 'categories'],
    queryFn: () => categoriesApi.getAll(tournamentId),
  });

  const {data: competitorsData} = useQuery({
    queryKey: ['competitors', {search: debouncedCompetitorSearch, type: '', page: 1}],
    queryFn: () => competitorsApi.getAll({search: debouncedCompetitorSearch || undefined}),
    enabled: canRegister,
  });

  const openCategories = categoriesData.filter((c) => c.status === 'OPEN');
  const allCompetitors = competitorsData?.data || [];
  const competitorsNotInTournament = allCompetitors.filter(
    (c) => !registrations.some((r) => r.competitor.id === c.id),
  );

  const registerMutation = useMutation({
    mutationFn: (competitorId) => registrationsApi.register(tournamentId, competitorId),
    onSuccess: () => {
      invalidateRegs();
      setSelectedCompetitorId('');
      toastSuccess('Compétiteur inscrit');
    },
    onError: (e) => toastError(e.error || "Erreur lors de l'inscription"),
  });

  const unregisterMutation = useMutation({
    mutationFn: (competitorId) => registrationsApi.unregister(tournamentId, competitorId),
    onSuccess: () => {
      invalidateRegs();
      toastSuccess('Compétiteur désinscrit');
    },
    onError: (e) => toastError(e.error || 'Erreur lors de la désinscription'),
  });

  const setSeedMutation = useMutation({
    mutationFn: ({competitorId, seed}) => registrationsApi.setSeed(tournamentId, competitorId, seed),
    onSuccess: () => {
      invalidateRegs();
      toastSuccess('Classement mis à jour');
    },
    onError: (e) => toastError(e.error || 'Erreur lors de la mise à jour du classement'),
  });

  const setCategoryMutation = useMutation({
    mutationFn: ({competitorId, categoryId}) =>
      registrationsApi.setCategory(tournamentId, competitorId, categoryId),
    onSuccess: () => {
      invalidateRegs();
      toastSuccess('Catégorie assignée');
    },
    onError: (e) => toastError(e.error || "Erreur lors de l'affectation"),
  });

  const handleRegister = (e) => {
    e.preventDefault();
    if (!selectedCompetitorId) return;
    registerMutation.mutate(selectedCompetitorId);
  };

  const handleSeedChange = (e, competitorId) => {
    const val = e.target.value;
    const parsed = val ? parseInt(val, 10) : null;

    if (val && (isNaN(parsed) || parsed < 1 || parsed > 999)) {
      toastError('Le classement doit être un entier entre 1 et 999.');
      return;
    }

    const currentSeed = registrations.find(r => r.competitor.id === competitorId)?.seed ?? null;
    if (parsed === currentSeed) return;

    setSeedMutation.mutate({competitorId, seed: parsed});
  };

  const handleCategoryChange = (competitorId, categoryId) => {
    setCategoryMutation.mutate({competitorId, categoryId: categoryId === '__none__' ? null : categoryId});
  };

  if (isLoading) return <TableSkeleton rows={3} cols={6}/>;
  if (isError) return <p className="text-sm text-destructive">Impossible de charger les inscriptions.</p>;

  return (
    <div className="space-y-4">
      {/* Formulaire d'inscription */}
      {canRegister && (
        <Card>
          <CardHeader><CardTitle>Inscrire un combattant</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Input
              placeholder="Rechercher un compétiteur…"
              value={competitorSearch}
              onChange={handleCompetitorSearchChange}
            />
            {competitorsNotInTournament.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {competitorSearch
                  ? `Aucun résultat pour « ${competitorSearch} ».`
                  : 'Tous les compétiteurs sont déjà inscrits ou aucun n\'est disponible.'}
              </p>
            ) : (
              <form onSubmit={handleRegister} className="flex gap-2">
                <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choisir un combattant…"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Joueurs</SelectLabel>
                      {competitorsNotInTournament.filter((c) => c.type === 'PLAYER').map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.gender && <span className="text-muted-foreground ml-1">· {GENDER_LABELS[c.gender]}</span>}
                          {c.birthYear && <span className="text-muted-foreground ml-1">· {c.birthYear}</span>}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Équipes</SelectLabel>
                      {competitorsNotInTournament.filter((c) => c.type === 'TEAM').map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={!selectedCompetitorId || registerMutation.isPending}>
                  Inscrire
                </Button>
              </form>
            )}
            {competitorsData?.pagination?.total > allCompetitors.length && (
              <p className="text-xs text-muted-foreground">
                {competitorsData.pagination.total - allCompetitors.length} compétiteur(s) non affiché(s) — affinez la recherche.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compteur */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {registrations.length} inscription{registrations.length !== 1 ? 's' : ''}
          {registrations.filter((r) => !r.categoryId).length > 0 && (
            <span className="ml-2 text-yellow-600">
              · {registrations.filter((r) => !r.categoryId).length} en liste d'attente
            </span>
          )}
        </p>
      </div>

      {/* Table */}
      {registrations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground border rounded-lg">
          <Users className="h-10 w-10"/>
          <p>Aucune inscription pour ce tournoi</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Nom</th>
              <th className="px-4 py-2.5 text-left font-medium">Type</th>
              <th className="px-4 py-2.5 text-left font-medium">Genre · Année</th>
              <th className="px-4 py-2.5 text-left font-medium">Catégorie</th>
              <th className="px-4 py-2.5 text-left font-medium">Classement</th>
              <th className="px-4 py-2.5 text-left font-medium">Actions</th>
            </tr>
            </thead>
            <tbody className="divide-y">
            {registrations.map((reg) => {
              const c = reg.competitor;
              const assignedCategory = categoriesData.find((cat) => cat.id === reg.categoryId);
              return (
                <tr key={reg.id} className="bg-background hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3"><CompetitorTypeBadge type={c.type}/></td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {c.gender ? GENDER_LABELS[c.gender] : '—'}
                    {c.birthYear ? ` · ${c.birthYear}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    {canAssign && openCategories.length > 0 ? (
                      <Select
                        value={reg.categoryId ?? '__none__'}
                        onValueChange={(v) => handleCategoryChange(c.id, v)}
                        disabled={setCategoryMutation.isPending}
                      >
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue/>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-yellow-600">Liste d'attente</span>
                          </SelectItem>
                          {openCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : assignedCategory ? (
                      <Badge variant="outline">{assignedCategory.name}</Badge>
                    ) : (
                      <WaitlistBadge/>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      key={reg.id + '-' + (reg.seed ?? 'null')}
                      type="number"
                      className="h-8 w-20 text-xs"
                      defaultValue={reg.seed || ''}
                      onBlur={(e) => handleSeedChange(e, c.id)}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {canUnregister && (
                      <ConfirmActionDialog
                        trigger={<Button size="sm" variant="destructive"
                                         disabled={unregisterMutation.isPending}>Désinscrire</Button>}
                        title="Désinscrire le compétiteur ?"
                        description="Cette action est irréversible et supprimera les données d'inscription associées."
                        confirmLabel="Désinscrire"
                        confirmVariant="destructive"
                        onConfirm={() => unregisterMutation.mutate(c.id)}
                        isLoading={unregisterMutation.isPending}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InscriptionsTab;
