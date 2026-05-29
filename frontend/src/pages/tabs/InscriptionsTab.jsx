import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/main.jsx';
import { useState, useEffect, useRef } from 'react';
import registrationsApi from '@/api/registrations.js';
import categoriesApi from '@/api/categories.js';
import competitorsApi from '@/api/competitors.js';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog.jsx';
import { toastSuccess, toastError } from '@/lib/toast.js';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.jsx';
import CompetitorTypeBadge from '@/components/CompetitorTypeBadge.jsx';
import TableSkeleton from '@/components/TableSkeleton.jsx';
import { Users, Upload, Loader2, AlertTriangle, Info, Search, ChevronUp, ChevronDown, ChevronsUpDown, X, Pencil, Download } from 'lucide-react';

const GENDER_LABELS = { MALE: 'M', FEMALE: 'F', MIXED: 'MX' };

// ── Helpers CSV (modèle + export erreurs) ───────────────────────────────────────
const CSV_TEMPLATE =
  'prenom,nom,genre,datenaissance,club\n' +
  'Adam,Benali,M,2011,Taekwondo Club Paris 15\n' +
  'Sarah,Dubois,F,2012,ATC Versailles\n';

const escapeCSV = (val) => {
  const s = String(val ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCSV = (filename, content) => {
  // BOM pour qu'Excel ouvre l'UTF-8 correctement
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const WaitlistBadge = () => (
  <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Liste d'attente</Badge>
);

const InscriptionsTab = ({ tournamentId, tournamentStatus }) => {
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('');
  const [competitorSearch, setCompetitorSearch] = useState('');
  const [debouncedCompetitorSearch, setDebouncedCompetitorSearch] = useState('');

  // Table filters & sort
  const [tableSearch, setTableSearch]     = useState('');
  const [tableCategory, setTableCategory] = useState('all');
  const [tableSort, setTableSort]         = useState('name');
  const [tableSortDir, setTableSortDir]   = useState('asc');

  // Edit competitor
  const [editReg, setEditReg]     = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [formError, setFormError]   = useState('');

  // Métier #12 — cohérence DRAFT/OPEN : même droits que l'import CSV
  const canRegister   = ['DRAFT', 'OPEN'].includes(tournamentStatus);
  const canUnregister = ['DRAFT', 'OPEN'].includes(tournamentStatus);
  const canAssign     = ['DRAFT', 'OPEN'].includes(tournamentStatus);
  const canImport     = ['DRAFT', 'OPEN'].includes(tournamentStatus);

  const csvInputRef = useRef(null);

  // Métier #8 — état prévisualisation
  const [previewFile, setPreviewFile]   = useState(null);
  const [importMode, setImportMode]     = useState('merge');
  const [previewData, setPreviewData]   = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedCompetitorSearch(competitorSearch), 300);
    return () => clearTimeout(t);
  }, [competitorSearch]);

  const handleCompetitorSearchChange = (e) => {
    setCompetitorSearch(e.target.value);
    setSelectedCompetitorId('');
  };

  const invalidateRegs = () =>
    queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId, 'registrations'] });

  const { data: registrations = [], isLoading, isError } = useQuery({
    queryKey: ['tournament', tournamentId, 'registrations'],
    queryFn: () => registrationsApi.getAll(tournamentId),
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['tournament', tournamentId, 'categories'],
    queryFn: () => categoriesApi.getAll(tournamentId),
  });

  const { data: competitorsData } = useQuery({
    queryKey: ['competitors', { search: debouncedCompetitorSearch, type: '', page: 1 }],
    queryFn: () => competitorsApi.getAll({ search: debouncedCompetitorSearch || undefined }),
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
    mutationFn: ({ competitorId, seed }) => registrationsApi.setSeed(tournamentId, competitorId, seed),
    onSuccess: () => {
      invalidateRegs();
      toastSuccess('Classement mis à jour');
    },
    onError: (e) => toastError(e.error || 'Erreur lors de la mise à jour du classement'),
  });

  // Métier #8 / #11 — import avec mode
  const importMutation = useMutation({
    mutationFn: ({ file, mode }) => registrationsApi.importCSV(tournamentId, file, mode),
    onSuccess: (report) => {
      invalidateRegs();
      const parts = [];
      if (report.created > 0) parts.push(`${report.created} importé${report.created > 1 ? 's' : ''}`);
      if (report.updated > 0) parts.push(`${report.updated} mis à jour`);
      if (report.skipped > 0) parts.push(`${report.skipped} ignoré${report.skipped > 1 ? 's' : ''}`);
      toastSuccess(parts.join(', ') || 'Import terminé');
      if (report.errors?.length > 0) {
        report.errors.slice(0, 3).forEach(({ line, message }) =>
          toastError(`Ligne ${line} : ${message}`)
        );
        if (report.errors.length > 3) toastError(`…et ${report.errors.length - 3} autre(s) erreur(s)`);
      }
      closePreview();
    },
    onError: (e) => toastError(e.error || "Erreur lors de l'import"),
    onSettled: () => { if (csvInputRef.current) csvInputRef.current.value = ''; },
  });

  const setCategoryMutation = useMutation({
    mutationFn: ({ competitorId, categoryId }) =>
      registrationsApi.setCategory(tournamentId, competitorId, categoryId),
    onSuccess: () => {
      invalidateRegs();
      toastSuccess('Catégorie assignée');
    },
    onError: (e) => toastError(e.error || "Erreur lors de l'affectation"),
  });

  const updateCompetitorMutation = useMutation({
    mutationFn: ({ id, data }) => competitorsApi.update(id, data),
    onSuccess: () => {
      invalidateRegs();
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      setEditReg(null);
      toastSuccess('Compétiteur mis à jour');
    },
    onError: (e) => setFormError(e.error || 'Erreur lors de la mise à jour'),
  });

  // ── Prévisualisation ────────────────────────────────────────────────────────
  const runPreview = async (file, mode) => {
    setIsPreviewing(true);
    try {
      const data = await registrationsApi.previewCSV(tournamentId, file, mode);
      setPreviewData(data);
    } catch (e) {
      toastError(e.error || 'Erreur lors de la prévisualisation');
      setPreviewFile(null);
      if (csvInputRef.current) csvInputRef.current.value = '';
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleModeChange = (mode) => {
    setImportMode(mode);
    if (previewFile) runPreview(previewFile, mode);
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewData(null);
    setImportMode('merge');
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const confirmImport = () => {
    importMutation.mutate({ file: previewFile, mode: importMode });
  };

  const handleCSVChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewFile(file);
      setImportMode('merge');
      runPreview(file, 'merge');
    }
  };

  // ── Autres handlers ─────────────────────────────────────────────────────────
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
    const currentSeed = registrations.find((r) => r.competitor.id === competitorId)?.seed ?? null;
    if (parsed === currentSeed) return;
    setSeedMutation.mutate({ competitorId, seed: parsed });
  };

  const handleCategoryChange = (competitorId, categoryId) => {
    setCategoryMutation.mutate({ competitorId, categoryId: categoryId === '__none__' ? null : categoryId });
  };

  const openEdit = (reg) => {
    setFormErrors({});
    setFormError('');
    setEditReg(reg);
    setEditForm({
      name:      reg.competitor.name      ?? '',
      type:      reg.competitor.type      ?? 'PLAYER',
      gender:    reg.competitor.gender    ?? '__none__',
      birthYear: reg.competitor.birthYear ?? '',
      club:      reg.competitor.club      ?? '',
    });
  };

  const saveEdit = () => {
    const errors = {};
    if (!editForm.name?.trim()) {
      errors.name = 'Le nom est requis';
    }
    if (editForm.birthYear !== '' && editForm.birthYear !== undefined) {
      const y = parseInt(editForm.birthYear, 10);
      if (isNaN(y) || y < 1900 || y > new Date().getFullYear()) {
        errors.birthYear = `Année invalide (1900–${new Date().getFullYear()})`;
      }
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setFormError('');
    updateCompetitorMutation.mutate({
      id:   editReg.competitor.id,
      data: {
        name:      editForm.name.trim(),
        type:      editForm.type || undefined,
        gender:    (editForm.gender && editForm.gender !== '__none__') ? editForm.gender : null,
        birthYear: editForm.birthYear ? parseInt(editForm.birthYear, 10) : null,
        club:      editForm.club?.trim() || null,
      },
    });
  };

  const handleSort = (col) => {
    if (tableSort === col) {
      setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setTableSort(col);
      setTableSortDir('asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (tableSort !== col) return <ChevronsUpDown className="inline h-3.5 w-3.5 ml-1 text-muted-foreground/40" />;
    return tableSortDir === 'asc'
      ? <ChevronUp className="inline h-3.5 w-3.5 ml-1" />
      : <ChevronDown className="inline h-3.5 w-3.5 ml-1" />;
  };

  if (isLoading) return <TableSkeleton rows={3} cols={7} />;
  if (isError) return <p className="text-sm text-destructive">Impossible de charger les inscriptions.</p>;

  const willImport = (previewData?.created ?? 0) + (previewData?.updated ?? 0);

  // Counters (always raw)
  const confirmedRegs = registrations.filter((r) => r.categoryId);
  const waitlistRegs  = registrations.filter((r) => !r.categoryId);

  // Table — filter
  let filteredRegs = registrations;
  if (tableSearch.trim()) {
    const q = tableSearch.trim().toLowerCase();
    filteredRegs = filteredRegs.filter(
      (r) =>
        r.competitor.name?.toLowerCase().includes(q) ||
        r.competitor.club?.toLowerCase().includes(q),
    );
  }
  if (tableCategory === 'waitlist') {
    filteredRegs = filteredRegs.filter((r) => !r.categoryId);
  } else if (tableCategory !== 'all') {
    filteredRegs = filteredRegs.filter((r) => r.categoryId === tableCategory);
  }

  // Table — sort
  const sortedFiltered = [...filteredRegs].sort((a, b) => {
    let va, vb;
    switch (tableSort) {
      case 'seed':
        va = a.seed ?? Infinity;
        vb = b.seed ?? Infinity;
        break;
      case 'category': {
        const catA = categoriesData.find((c) => c.id === a.categoryId)?.name ?? '';
        const catB = categoriesData.find((c) => c.id === b.categoryId)?.name ?? '';
        va = catA.toLowerCase();
        vb = catB.toLowerCase();
        break;
      }
      default: // 'name'
        va = a.competitor.name?.toLowerCase() ?? '';
        vb = b.competitor.name?.toLowerCase() ?? '';
    }
    if (va < vb) return tableSortDir === 'asc' ? -1 : 1;
    if (va > vb) return tableSortDir === 'asc' ? 1 : -1;
    return 0;
  });

  // Re-split for separator rendering
  const filteredConfirmed = sortedFiltered.filter((r) => r.categoryId);
  const filteredWaitlist  = sortedFiltered.filter((r) => !r.categoryId);
  const sortedRegs        = [...filteredConfirmed, ...filteredWaitlist];
  const hasActiveFilter   = tableSearch.trim() !== '' || tableCategory !== 'all';

  return (
    <div className="space-y-4">

      {/* UX #8 — Bandeau contextuel DRAFT */}
      {tournamentStatus === 'DRAFT' && (
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 px-3.5 py-2.5 text-sm text-blue-800">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
          <p>
            Le tournoi est en <strong>brouillon</strong>. Vous pouvez inscrire des participants
            manuellement ou via import CSV. Pour ouvrir les inscriptions au public, utilisez
            le bouton <strong>Ouvrir les inscriptions</strong> dans l'onglet Général.
          </p>
        </div>
      )}

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
                  : "Tous les compétiteurs sont déjà inscrits ou aucun n'est disponible."}
              </p>
            ) : (
              <form onSubmit={handleRegister} className="flex gap-2">
                <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choisir un combattant…" />
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

      {/* Compteur + import CSV */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {confirmedRegs.length} inscrit{confirmedRegs.length !== 1 ? 's' : ''}
          {waitlistRegs.length > 0 && (
            <span className="ml-2 text-yellow-600 font-medium">
              · {waitlistRegs.length} en attente
            </span>
          )}
        </p>
        {canImport && (
          <div className="flex items-center gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCSVChange}
            />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => downloadCSV('modele-inscriptions.csv', CSV_TEMPLATE)}
              title="Télécharger un fichier CSV d'exemple"
            >
              <Download className="h-4 w-4 mr-2" />Modèle CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isPreviewing}
              onClick={() => csvInputRef.current?.click()}
            >
              {isPreviewing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyse en cours…</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />Importer CSV</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Filtres + tri */}
      {registrations.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher par nom ou club…"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={tableCategory} onValueChange={setTableCategory}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              <SelectItem value="waitlist">
                <span className="text-yellow-600">Liste d'attente</span>
              </SelectItem>
              {categoriesData.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-muted-foreground"
              onClick={() => { setTableSearch(''); setTableCategory('all'); }}
            >
              <X className="h-4 w-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>
      )}

      {/* Tableau */}
      {registrations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground border rounded-lg">
          <Users className="h-10 w-10" />
          <p>Aucune inscription pour ce tournoi</p>
        </div>
      ) : sortedRegs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground border rounded-lg">
          <Search className="h-8 w-8" />
          <p className="text-sm">Aucun résultat pour cette recherche</p>
          <Button variant="ghost" size="sm" onClick={() => { setTableSearch(''); setTableCategory('all'); }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th
                  className="px-4 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/80 select-none whitespace-nowrap"
                  onClick={() => handleSort('name')}
                >
                  Nom <SortIcon col="name" />
                </th>
                <th className="px-4 py-2.5 text-left font-medium">Type</th>
                <th className="px-4 py-2.5 text-left font-medium">Genre · Année</th>
                <th className="px-4 py-2.5 text-left font-medium">Club</th>
                <th
                  className="px-4 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/80 select-none whitespace-nowrap"
                  onClick={() => handleSort('category')}
                >
                  Catégorie <SortIcon col="category" />
                </th>
                <th
                  className="px-4 py-2.5 text-left font-medium cursor-pointer hover:bg-muted/80 select-none whitespace-nowrap"
                  onClick={() => handleSort('seed')}
                >
                  Classement <SortIcon col="seed" />
                </th>
                <th className="px-4 py-2.5 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedRegs.map((reg, idx) => {
                const c = reg.competitor;
                const assignedCategory = categoriesData.find((cat) => cat.id === reg.categoryId);
                const isWaitlist = !reg.categoryId;
                // Insérer le séparateur juste avant la première ligne de la liste d'attente
                const showSeparator = isWaitlist && filteredConfirmed.length > 0 && idx === filteredConfirmed.length;
                return (
                  <React.Fragment key={reg.id}>
                    {showSeparator && (
                      <tr>
                        <td colSpan={7} className="px-4 py-2 bg-yellow-50 border-y border-yellow-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">
                              Liste d'attente
                            </span>
                            <span className="text-xs text-yellow-600">
                              — {filteredWaitlist.length} compétiteur{filteredWaitlist.length > 1 ? 's' : ''} sans catégorie assignée
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  <tr className={`hover:bg-muted/30 transition-colors ${isWaitlist ? 'bg-yellow-50/40' : 'bg-background'}`}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3"><CompetitorTypeBadge type={c.type} /></td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {c.gender ? GENDER_LABELS[c.gender] : '—'}
                      {c.birthYear ? ` · ${c.birthYear}` : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{c.club || '—'}</td>
                    <td className="px-4 py-3">
                      {canAssign && openCategories.length > 0 ? (
                        <Select
                          value={reg.categoryId ?? '__none__'}
                          onValueChange={(v) => handleCategoryChange(c.id, v)}
                          disabled={setCategoryMutation.isPending}
                        >
                          <SelectTrigger className="h-8 w-44 text-xs">
                            <SelectValue />
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
                        <WaitlistBadge />
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
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          title="Modifier"
                          onClick={() => openEdit(reg)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {canUnregister && (
                          <ConfirmActionDialog
                            trigger={
                              <Button size="sm" variant="destructive" disabled={unregisterMutation.isPending}>
                                Désinscrire
                              </Button>
                            }
                            title="Désinscrire le compétiteur ?"
                            description="Cette action est irréversible et supprimera les données d'inscription associées."
                            confirmLabel="Désinscrire"
                            confirmVariant="destructive"
                            onConfirm={() => unregisterMutation.mutate(c.id)}
                            isLoading={unregisterMutation.isPending}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Dialog d'édition compétiteur ────────────────────────────────────── */}
      <Dialog
        open={!!editReg}
        onOpenChange={(open) => !open && !updateCompetitorMutation.isPending && setEditReg(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le compétiteur</DialogTitle>
            {editReg && (
              <DialogDescription className="truncate">{editReg.competitor.name}</DialogDescription>
            )}
          </DialogHeader>

          <div className="grid gap-4 py-1">
            {/* Erreur serveur générale */}
            {formError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Nom */}
            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">Nom <span className="text-destructive">*</span></Label>
              <Input
                id="edit-name"
                value={editForm.name ?? ''}
                onChange={(e) => {
                  setEditForm((f) => ({ ...f, name: e.target.value }));
                  if (formErrors.name) setFormErrors((fe) => ({ ...fe, name: undefined }));
                }}
                placeholder="Nom du compétiteur"
                aria-invalid={!!formErrors.name}
                className={formErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                autoFocus
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>

            {/* Type */}
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select
                value={editForm.type ?? 'PLAYER'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLAYER">Joueur</SelectItem>
                  <SelectItem value="TEAM">Équipe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Genre */}
            <div className="grid gap-1.5">
              <Label>Genre</Label>
              <Select
                value={editForm.gender ?? '__none__'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, gender: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Non précisé</SelectItem>
                  <SelectItem value="MALE">Homme</SelectItem>
                  <SelectItem value="FEMALE">Femme</SelectItem>
                  <SelectItem value="MIXED">Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Année + Club côte à côte */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-year">Année de naissance</Label>
                <Input
                  id="edit-year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={editForm.birthYear ?? ''}
                  onChange={(e) => {
                    setEditForm((f) => ({ ...f, birthYear: e.target.value }));
                    if (formErrors.birthYear) setFormErrors((fe) => ({ ...fe, birthYear: undefined }));
                  }}
                  placeholder="—"
                  aria-invalid={!!formErrors.birthYear}
                  className={formErrors.birthYear ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {formErrors.birthYear && (
                  <p className="text-xs text-destructive">{formErrors.birthYear}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-club">Club</Label>
                <Input
                  id="edit-club"
                  value={editForm.club ?? ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, club: e.target.value }))}
                  placeholder="—"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditReg(null)}
              disabled={updateCompetitorMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={saveEdit}
              disabled={!editForm.name?.trim() || updateCompetitorMutation.isPending}
            >
              {updateCompetitorMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog de prévisualisation d'import ─────────────────────────────── */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && !importMutation.isPending && closePreview()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Prévisualisation de l'import</DialogTitle>
            {previewFile && (
              <DialogDescription className="truncate">{previewFile.name}</DialogDescription>
            )}
          </DialogHeader>

          {/* Mode d'import */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Mode d'import</p>
            <div className="flex gap-2">
              <Button
                variant={importMode === 'merge' ? 'default' : 'outline'}
                size="sm"
                disabled={isPreviewing || importMutation.isPending}
                onClick={() => handleModeChange('merge')}
              >
                Fusionner
              </Button>
              <Button
                variant={importMode === 'replace' ? 'default' : 'outline'}
                size="sm"
                disabled={isPreviewing || importMutation.isPending}
                onClick={() => handleModeChange('replace')}
              >
                Remplacer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {importMode === 'merge'
                ? 'Les inscriptions existantes sont conservées. Les doublons sont ignorés.'
                : 'Toutes les inscriptions existantes seront supprimées avant l\'import.'}
            </p>
            {importMode === 'replace' && registrations.length > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{registrations.length} inscription{registrations.length > 1 ? 's' : ''} existante{registrations.length > 1 ? 's' : ''} seront supprimées.</span>
              </div>
            )}
          </div>

          {/* Résumé */}
          {isPreviewing ? (
            <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Analyse en cours…</span>
            </div>
          ) : previewData && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg border bg-green-50 p-3">
                  <p className="text-xl font-bold text-green-700">{previewData.created}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">à créer</p>
                </div>
                <div className="rounded-lg border bg-blue-50 p-3">
                  <p className="text-xl font-bold text-blue-700">{previewData.updated}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">à mettre à jour</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xl font-bold text-muted-foreground">{previewData.skipped}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">ignorés</p>
                </div>
                <div className={`rounded-lg border p-3 ${previewData.errors.length > 0 ? 'bg-destructive/5' : ''}`}>
                  <p className={`text-xl font-bold ${previewData.errors.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {previewData.errors.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">erreurs</p>
                </div>
              </div>

              {previewData.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-destructive">
                      {previewData.errors.length} erreur{previewData.errors.length > 1 ? 's' : ''} détectée{previewData.errors.length > 1 ? 's' : ''}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => downloadCSV(
                        'erreurs-import.csv',
                        'ligne,message\n' +
                          previewData.errors.map((e) => `${escapeCSV(e.line)},${escapeCSV(e.message)}`).join('\n') + '\n',
                      )}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />Exporter
                    </Button>
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-lg border bg-destructive/5 p-3 space-y-1">
                    {previewData.errors.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">
                        <span className="font-medium">Ligne {e.line} :</span> {e.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closePreview}
              disabled={importMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmImport}
              disabled={isPreviewing || importMutation.isPending || willImport === 0}
            >
              {importMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Import en cours…</>
              ) : (
                `Importer ${willImport} inscription${willImport > 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InscriptionsTab;
