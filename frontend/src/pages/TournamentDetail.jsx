import {useParams, Link, useNavigate} from 'react-router-dom';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useState} from 'react';
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
  const navigate     = useNavigate();
  const [activeTab, setActiveTab] = useState('general');

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

  const cancelMutation = useMutation({
    mutationFn: () => tournamentsApi.cancel(tournamentId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournament', tournamentId]});
      queryClient.invalidateQueries({queryKey: ['tournaments']});
      toastSuccess('Tournoi annulé');
    },
    onError: (error) => toastError(error.error || "Erreur lors de l'annulation du tournoi"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => tournamentsApi.remove(tournamentId),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournaments']});
      toastSuccess('Tournoi supprimé');
      navigate('/tournaments');
    },
    onError: (error) => toastError(error.error || 'Erreur lors de la suppression du tournoi'),
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
          <TabsTrigger value="inscriptions">Inscriptions</TabsTrigger>
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
        </TabsList>

        {/* ── GÉNÉRAL ── */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
                      isLoading={startTournamentMutation.isPending}
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
                      isLoading={startTournamentMutation.isPending}
                    />
                  )}
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(tournament.status) && (
                <ConfirmActionDialog
                  trigger={
                    <Button variant="outline" size="sm" disabled={cancelMutation.isPending}>
                      Annuler le tournoi
                    </Button>
                  }
                  title="Annuler le tournoi ?"
                  description="Le tournoi sera marqué comme annulé. Les inscriptions et brackets sont conservés mais le tournoi ne pourra plus progresser."
                  confirmLabel="Annuler le tournoi"
                  confirmVariant="destructive"
                  onConfirm={() => cancelMutation.mutate()}
                  isLoading={cancelMutation.isPending}
                />
              )}
              {['DRAFT', 'OPEN'].includes(tournament.status) && (
                <ConfirmActionDialog
                  trigger={
                    <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}>
                      Supprimer
                    </Button>
                  }
                  title="Supprimer le tournoi ?"
                  description="Cette action est irréversible. Le tournoi et toutes ses données (inscriptions, catégories) seront définitivement supprimés."
                  confirmLabel="Supprimer définitivement"
                  confirmVariant="destructive"
                  onConfirm={() => deleteMutation.mutate()}
                  isLoading={deleteMutation.isPending}
                />
              )}
            </div>
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
            tournamentName={tournament.name}
            onSwitchTab={setActiveTab}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentDetail;
