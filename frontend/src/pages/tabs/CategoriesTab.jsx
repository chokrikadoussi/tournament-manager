import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/main.jsx';
import { useState } from 'react';
import categoriesApi from '@/api/categories.js';
import { Button } from '@/components/ui/button.jsx';
import {
  Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog.jsx';
import { Field, FieldGroup } from '@/components/ui/field.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { toastSuccess, toastError } from '@/lib/toast.js';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.jsx';
import CategoryStatusBadge from '@/components/CategoryStatusBadge.jsx';
import TableSkeleton from '@/components/TableSkeleton.jsx';
import { Tag } from 'lucide-react';

const GENDER_LABELS = { MALE: 'Masculin', FEMALE: 'Féminin', MIXED: 'Mixte' };

const EMPTY_FORM = { name: '', gender: '', birthYearMin: '', birthYearMax: '', maxParticipants: '' };

const buildPayload = (form) => ({
  name: form.name.trim(),
  gender: form.gender || undefined,
  birthYearMin: form.birthYearMin ? parseInt(form.birthYearMin, 10) : undefined,
  birthYearMax: form.birthYearMax ? parseInt(form.birthYearMax, 10) : undefined,
  maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants, 10) : undefined,
});

const CategoryForm = ({ form, setForm }) => (
  <FieldGroup>
    <Field>
      <Label htmlFor="cat-name">Nom</Label>
      <Input id="cat-name" placeholder="ex: Junior Masculin" required maxLength={100}
        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
    </Field>
    <Field>
      <Label htmlFor="cat-gender">Genre</Label>
      <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
        <SelectTrigger id="cat-gender"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="MALE">Masculin</SelectItem>
          <SelectItem value="FEMALE">Féminin</SelectItem>
          <SelectItem value="MIXED">Mixte</SelectItem>
        </SelectContent>
      </Select>
    </Field>
    <div className="grid grid-cols-2 gap-3">
      <Field>
        <Label htmlFor="cat-min">Année min</Label>
        <Input id="cat-min" type="number" placeholder="ex: 2005" min={1900} max={new Date().getFullYear()}
          value={form.birthYearMin} onChange={(e) => setForm({ ...form, birthYearMin: e.target.value })} />
      </Field>
      <Field>
        <Label htmlFor="cat-max">Année max</Label>
        <Input id="cat-max" type="number" placeholder="ex: 2010" min={1900} max={new Date().getFullYear()}
          value={form.birthYearMax} onChange={(e) => setForm({ ...form, birthYearMax: e.target.value })} />
      </Field>
    </div>
    <Field>
      <Label htmlFor="cat-max-p">Max participants</Label>
      <Input id="cat-max-p" type="number" placeholder="ex: 16" min={2}
        value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })} />
    </Field>
  </FieldGroup>
);

const CategoriesTab = ({ tournamentId, tournamentStatus }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const canCreate = ['DRAFT', 'OPEN'].includes(tournamentStatus);
  const canOpen   = tournamentStatus === 'OPEN';
  const canStart  = ['OPEN', 'IN_PROGRESS'].includes(tournamentStatus);
  const canEdit   = tournamentStatus === 'DRAFT';

  const invalidateCategories = () =>
    queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId, 'categories'] });

  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ['tournament', tournamentId, 'categories'],
    queryFn: () => categoriesApi.getAll(tournamentId),
  });

  const createMutation = useMutation({
    mutationFn: (data) => categoriesApi.create(tournamentId, data),
    onSuccess: () => { invalidateCategories(); setCreateOpen(false); setCreateForm(EMPTY_FORM); toastSuccess('Catégorie créée'); },
    onError: (e) => toastError(e.error || 'Erreur lors de la création'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ categoryId, data }) => categoriesApi.update(tournamentId, categoryId, data),
    onSuccess: () => { invalidateCategories(); setEditCategory(null); toastSuccess('Catégorie mise à jour'); },
    onError: (e) => toastError(e.error || 'Erreur lors de la mise à jour'),
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId) => categoriesApi.remove(tournamentId, categoryId),
    onSuccess: () => { invalidateCategories(); toastSuccess('Catégorie supprimée'); },
    onError: (e) => toastError(e.error || 'Erreur lors de la suppression'),
  });

  const openMutation = useMutation({
    mutationFn: (categoryId) => categoriesApi.open(tournamentId, categoryId),
    onSuccess: () => { invalidateCategories(); toastSuccess('Catégorie ouverte'); },
    onError: (e) => toastError(e.error || 'Erreur lors de l\'ouverture'),
  });

  const closeMutation = useMutation({
    mutationFn: (categoryId) => categoriesApi.close(tournamentId, categoryId),
    onSuccess: () => { invalidateCategories(); toastSuccess('Catégorie fermée'); },
    onError: (e) => toastError(e.error || 'Erreur lors de la fermeture'),
  });

  const startMutation = useMutation({
    mutationFn: (categoryId) => categoriesApi.start(tournamentId, categoryId),
    onSuccess: () => {
      invalidateCategories();
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toastSuccess('Catégorie démarrée — bracket généré');
    },
    onError: (e) => toastError(e.error || 'Erreur lors du démarrage'),
  });

  const cancelMutation = useMutation({
    mutationFn: (categoryId) => categoriesApi.cancel(tournamentId, categoryId),
    onSuccess: () => { invalidateCategories(); toastSuccess('Catégorie annulée'); },
    onError: (e) => toastError(e.error || 'Erreur lors de l\'annulation'),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    createMutation.mutate(buildPayload(createForm));
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    updateMutation.mutate({ categoryId: editCategory.id, data: buildPayload(editForm) });
  };

  const openEditDialog = (cat) => {
    setEditCategory(cat);
    setEditForm({
      name: cat.name,
      gender: cat.gender || '',
      birthYearMin: cat.birthYearMin ?? '',
      birthYearMax: cat.birthYearMax ?? '',
      maxParticipants: cat.maxParticipants ?? '',
    });
  };

  const formatRange = (cat) => {
    if (!cat.birthYearMin && !cat.birthYearMax) return <span className="text-muted-foreground">—</span>;
    if (cat.birthYearMin && cat.birthYearMax) return `${cat.birthYearMin} – ${cat.birthYearMax}`;
    if (cat.birthYearMin) return `≥ ${cat.birthYearMin}`;
    return `≤ ${cat.birthYearMax}`;
  };

  if (isLoading) return <TableSkeleton rows={3} cols={5} />;
  if (isError) return <p className="text-sm text-destructive">Impossible de charger les catégories.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categories.length} catégorie{categories.length !== 1 ? 's' : ''}
        </p>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Nouvelle catégorie</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Créer une catégorie</DialogTitle>
                </DialogHeader>
                <CategoryForm form={createForm} setForm={setCreateForm} />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button" onClick={() => setCreateForm(EMPTY_FORM)}>Annuler</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createMutation.isPending}>Créer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Modifier la catégorie</DialogTitle>
            </DialogHeader>
            <CategoryForm form={editForm} setForm={setEditForm} />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditCategory(null)}>Annuler</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground border rounded-lg">
          <Tag className="h-10 w-10" />
          <p>Aucune catégorie configurée</p>
          {canCreate && (
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
              Ajouter une catégorie
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Nom</th>
                <th className="px-4 py-2.5 text-left font-medium">Genre</th>
                <th className="px-4 py-2.5 text-left font-medium">Années</th>
                <th className="px-4 py-2.5 text-left font-medium">Inscrits</th>
                <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                <th className="px-4 py-2.5 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((cat) => (
                <tr key={cat.id} className="bg-background hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cat.gender ? GENDER_LABELS[cat.gender] : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatRange(cat)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {cat._count?.registrations ?? 0}
                    {cat.maxParticipants ? <span className="text-muted-foreground"> / {cat.maxParticipants}</span> : ''}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryStatusBadge status={cat.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* DRAFT actions */}
                      {cat.status === 'DRAFT' && (
                        <>
                          {canOpen && (
                            <Button size="sm" onClick={() => openMutation.mutate(cat.id)}
                              disabled={openMutation.isPending}>
                              Ouvrir
                            </Button>
                          )}
                          {canEdit && (
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(cat)}>
                              Modifier
                            </Button>
                          )}
                          <ConfirmActionDialog
                            trigger={<Button size="sm" variant="destructive" disabled={deleteMutation.isPending}>Supprimer</Button>}
                            title="Supprimer la catégorie ?"
                            description="Cette action est irréversible."
                            confirmLabel="Supprimer"
                            confirmVariant="destructive"
                            onConfirm={() => deleteMutation.mutate(cat.id)}
                          />
                        </>
                      )}
                      {/* OPEN actions */}
                      {cat.status === 'OPEN' && (
                        <>
                          {canStart && (
                            <ConfirmActionDialog
                              trigger={<Button size="sm" disabled={startMutation.isPending}>Démarrer</Button>}
                              title="Démarrer la catégorie ?"
                              description="Le bracket sera généré pour cette catégorie. Cette action est irréversible."
                              confirmLabel="Démarrer"
                              onConfirm={() => startMutation.mutate(cat.id)}
                            />
                          )}
                          <Button size="sm" variant="outline" onClick={() => closeMutation.mutate(cat.id)}
                            disabled={closeMutation.isPending}>
                            Fermer
                          </Button>
                          <ConfirmActionDialog
                            trigger={<Button size="sm" variant="destructive" disabled={cancelMutation.isPending}>Annuler</Button>}
                            title="Annuler la catégorie ?"
                            description="La catégorie sera annulée et les inscriptions dissociées."
                            confirmLabel="Annuler la catégorie"
                            confirmVariant="destructive"
                            onConfirm={() => cancelMutation.mutate(cat.id)}
                          />
                        </>
                      )}
                      {['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(cat.status) && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CategoriesTab;
