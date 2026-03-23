import {keepPreviousData, useMutation, useQuery} from '@tanstack/react-query';
import {queryClient} from '@/main.jsx';
import competitorsApi from '@/api/competitors.js';
import {useMemo, useState, useEffect} from 'react';
import {Button} from '@/components/ui/button.jsx';
import {
  Dialog, DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx';
import {Field, FieldGroup} from '@/components/ui/field.jsx';
import {Label} from '@/components/ui/label.jsx';
import {Input} from '@/components/ui/input.jsx';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select.jsx';
import ErrorMessage from '@/components/ErrorMessage.jsx';
import TableSkeleton from '@/components/TableSkeleton.jsx';
import CompetitorTypeBadge from '@/components/CompetitorTypeBadge.jsx';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.jsx';
import {DataTable} from '@/components/ui/data-table.jsx';
import {Search, Users, ChevronLeft, ChevronRight} from 'lucide-react';
import {ToggleGroup, ToggleGroupItem} from '@/components/ui/toggle-group.jsx';

const PAGE_SIZE = 10;

const Competitors = () => {

  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({ name: '', type: 'PLAYER' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, filterType]);

  const clearData = () => {
    setFormData({ name: '', type: 'PLAYER' });
    setOpen(false);
  };

  const getCompetitors = useQuery({
    queryKey: ['competitors', { search: debouncedSearch, type: filterType, page }],
    queryFn: () => competitorsApi.getAll({
      search: debouncedSearch || undefined,
      type: filterType || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: (data) => competitorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      clearData();
    },
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => competitorsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
    },
  });

  const handleCreateCompetitor = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const competitors = getCompetitors.data?.data || [];
  const pagination = getCompetitors.data?.pagination;
  const hasActiveFilters = debouncedSearch || filterType;

  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Nom',
      enableSorting: true,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableSorting: false,
      cell: ({ row }) => <CompetitorTypeBadge type={row.original.type} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Créé le',
      enableSorting: true,
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('fr-FR'),
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => (
        <ConfirmActionDialog
          trigger={<Button variant="destructive" size="sm">Supprimer</Button>}
          title="Supprimer le compétiteur ?"
          description="Cette action est irréversible et supprimera toutes les données associées."
          confirmLabel="Supprimer"
          confirmVariant="destructive"
          onConfirm={() => deleteMutation.mutate(row.original.id)}
        />
      ),
    },
  ], [deleteMutation]);

  const emptyState = hasActiveFilters ? (
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <p>Aucun résultat pour « {debouncedSearch || filterType} »</p>
      <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setFilterType(''); }}>
        Effacer les filtres
      </Button>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <Users className="h-10 w-10" />
      <p>Aucun combattant enregistré</p>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Ajouter un combattant
      </Button>
    </div>
  );

  if (getCompetitors.isLoading) return <TableSkeleton />;
  if (getCompetitors.isError) return <p>Error: {getCompetitors.error?.message || String(getCompetitors.error)}</p>;

  return (
    <div className="space-y-4">
      <h1>Competitors</h1>
      <ErrorMessage message={errorMsg}/>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Inscrire un combattant</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleCreateCompetitor}>
            <DialogHeader>
              <DialogTitle>Créer un nouveau compétiteur</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label htmlFor="fullname">Nom</Label>
                <Input id="fullname" name="fullname" placeholder="Chokri K" value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}/>
              </Field>
              <Field>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger id="type">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAYER">Joueur</SelectItem>
                    <SelectItem value="TEAM">Equipe</SelectItem>
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

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true"/>
          <Input name="search-term" className="pl-9" placeholder="Rechercher..." value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}/>
        </div>
        <ToggleGroup variant="outline" type="single" value={filterType} onValueChange={setFilterType}>
          <ToggleGroupItem value="" aria-label="Tous">Tous</ToggleGroupItem>
          <ToggleGroupItem value="PLAYER" aria-label="Joueurs">Joueurs</ToggleGroupItem>
          <ToggleGroupItem value="TEAM" aria-label="Equipes">Equipes</ToggleGroupItem>
        </ToggleGroup>
        {pagination && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {pagination.total} compétiteur{pagination.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <DataTable columns={columns} data={competitors} emptyState={emptyState} />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)}
                    disabled={page === 1 || getCompetitors.isFetching}>
              <ChevronLeft className="h-4 w-4 mr-1"/> Précédent
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}
                    disabled={page >= pagination.totalPages || getCompetitors.isFetching}>
              Suivant <ChevronRight className="h-4 w-4 ml-1"/>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Competitors;
