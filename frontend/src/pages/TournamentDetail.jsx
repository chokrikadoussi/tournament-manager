import {useParams, Link} from 'react-router-dom';
import {useMutation, useQuery} from '@tanstack/react-query';
import tournamentsApi from '@/api/tournaments.js';
import registrationsApi from '@/api/registrations.js';
import {queryClient} from '@/main.jsx';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.jsx';
import {Button} from '@/components/ui/button.jsx';
import TableSkeleton from '@/components/TableSkeleton.jsx';
import TournamentStatusBadge from '@/components/TournamentStatusBadge.jsx';
import {toastSuccess, toastError} from '@/lib/toast.js';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb.jsx';
import {Tabs, TabsList, TabsTrigger, TabsContent} from '@/components/ui/tabs.jsx';
import CategoriesTab from '@/pages/tabs/CategoriesTab.jsx';
import InscriptionsTab from '@/pages/tabs/InscriptionsTab.jsx';
import BracketsTab from '@/pages/tabs/BracketsTab.jsx';

const FORMAT_LABELS = {
  SINGLE_ELIM: 'Élimination directe',
  ROUND_ROBIN: 'Mélée générale',
  DOUBLE_ELIM: 'Double élimination'
};

const TournamentDetail = () => {
  const tournamentId = useParams().id;

  const getTournament = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: () => tournamentsApi.getById(tournamentId),
  });

  const tournament = getTournament.data;

  const getRegistrations = useQuery({
    queryKey: ['tournament', tournamentId, 'registrations'],
    queryFn: () => registrationsApi.getAll(tournamentId),
  });

  const registrations = getRegistrations.data || [];

  // Mutations
  const openInscriptionsMutation = useMutation({
    mutationFn: (id) => tournamentsApi.openInscriptions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
      toastSuccess('Inscriptions ouvertes');
    },
    onError: (error) => toastError(error.error || "Erreur lors de l'ouverture des inscriptions"),
  });

  const closeInscriptionsMutation = useMutation({
    mutationFn: (id) => tournamentsApi.closeInscriptions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
      toastSuccess('Inscriptions clôturées');
    },
    onError: (error) => toastError(error.error || 'Erreur lors de la clôture des inscriptions'),
  });

  const startTournamentMutation = useMutation({
    mutationFn: (id) => tournamentsApi.startTournament(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
      toastSuccess('Tournoi démarré');
    },
    onError: (error) => toastError(error.error || 'Erreur lors du démarrage du tournoi'),
  });

  const handleInscriptions = (action) => {
    if (action === 'open') openInscriptionsMutation.mutate(tournamentId);
    else if (action === 'close') closeInscriptionsMutation.mutate(tournamentId);
  };

  if (getTournament.isLoading) return <TableSkeleton cols={5}/>;
  if (getTournament.isError) return <p className="text-sm text-destructive">Impossible de charger le tournoi.</p>;

  if (!tournament) return null;

  return (
    <div className="tournament-detail">

        <Breadcrumb className="text-sm text-muted-foreground mb-4">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Accueil</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator/>
            <BreadcrumbItem><BreadcrumbLink asChild><Link
              to="/tournaments">Tournois</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator/>
            <BreadcrumbItem><BreadcrumbPage>{tournament.name}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>


      <div className="flex items-center gap-3 mb-4">
        <h1>{tournament.name}</h1>
        <TournamentStatusBadge status={tournament.status}/>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="inscriptions">Inscriptions</TabsTrigger>
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
        </TabsList>

        {/* ── GÉNÉRAL ── */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            {tournament.status === 'DRAFT' && (
              <>
                <Button onClick={() => handleInscriptions('open')} disabled={openInscriptionsMutation.isPending}>
                  Ouvrir les inscriptions
                </Button>
                {registrations.length >= 2 && (
                  <ConfirmActionDialog
                    trigger={<Button disabled={startTournamentMutation.isPending}>Démarrer le tournoi</Button>}
                    title="Démarrer le tournoi ?"
                    description="Le bracket sera généré et les inscriptions seront clôturées. Cette action est irréversible."
                    confirmLabel="Démarrer"
                    onConfirm={() => startTournamentMutation.mutate(tournamentId)}
                  />
                )}
              </>
            )}
            {tournament.status === 'OPEN' && (
              <>
                <Button onClick={() => handleInscriptions('close')} disabled={closeInscriptionsMutation.isPending}>
                  Clôturer les inscriptions
                </Button>
                {registrations.length >= 2 && (
                  <ConfirmActionDialog
                    trigger={<Button disabled={startTournamentMutation.isPending}>Démarrer le tournoi</Button>}
                    title="Démarrer le tournoi ?"
                    description="Le bracket sera généré et les inscriptions seront clôturées. Cette action est irréversible."
                    confirmLabel="Démarrer"
                    onConfirm={() => startTournamentMutation.mutate(tournamentId)}
                  />
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
            <div><span className="text-muted-foreground">Format</span><p
              className="font-medium mt-0.5">{FORMAT_LABELS[tournament.format] ?? tournament.format}</p></div>
            <div><span className="text-muted-foreground">Sport</span><p
              className="font-medium mt-0.5">{tournament.sport || '—'}</p></div>
            <div><span className="text-muted-foreground">Inscrits</span><p
              className="font-medium mt-0.5">{tournament._count?.registrations ?? 0}</p></div>
          </div>
        </TabsContent>

        {/* ── CATÉGORIES ── */}
        <TabsContent value="categories" className="mt-4">
          <CategoriesTab tournamentId={tournamentId} tournamentStatus={tournament.status}/>
        </TabsContent>

        {/* ── INSCRIPTIONS ── */}
        <TabsContent value="inscriptions" className="mt-4">
          <InscriptionsTab tournamentId={tournamentId} tournamentStatus={tournament.status}/>
        </TabsContent>

        {/* ── BRACKETS ── */}
        <TabsContent value="brackets" className="mt-4">
          <BracketsTab
            tournamentId={tournamentId}
            tournamentStatus={tournament.status}
            registrations={registrations}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentDetail;
