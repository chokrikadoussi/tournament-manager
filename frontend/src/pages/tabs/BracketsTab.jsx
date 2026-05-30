import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/main.jsx';
import { useState } from 'react';
import bracketApi from '@/api/bracket.js';
import matchesApi from '@/api/matches.js';
import categoriesApi from '@/api/categories.js';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select.jsx';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { toastSuccess, toastError } from '@/lib/toast.js';
import CompetitorTypeBadge from '@/components/CompetitorTypeBadge.jsx';
import BracketView from '@/components/BracketView.jsx';
import { Check, Trophy, Pencil, FileDown, Medal, Tag, ArrowRight } from 'lucide-react';

const MATCH_STATUS_CONFIG = {
  PENDING:   { label: 'En attente', className: 'bg-muted text-muted-foreground hover:bg-muted' },
  READY:     { label: 'Prêt', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  BYE:       { label: 'Bye', className: 'bg-muted text-muted-foreground hover:bg-muted' },
  COMPLETED: { label: 'Terminé', className: 'bg-green-100 text-green-700 hover:bg-green-100', icon: Check },
};

const ROW_CLASS = {
  COMPLETED: 'bg-muted/30',
  BYE: 'opacity-50',
  READY: 'ring-1 ring-inset ring-primary/30 bg-primary/5',
};

const TODAY = new Date().toISOString().split('T')[0];

const BracketsTab = ({ tournamentId, tournamentStatus, registrations, tournamentName = '', onSwitchTab }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportForm, setExportForm] = useState({ lieu: '', date: TODAY });
  const [aireByCat, setAireByCat]   = useState({}); // Aire n° par catégorie (clé = id)

  const isActive = ['IN_PROGRESS', 'COMPLETED'].includes(tournamentStatus);

  const { data: categories = [] } = useQuery({
    queryKey: ['tournament', tournamentId, 'categories'],
    queryFn: () => categoriesApi.getAll(tournamentId),
  });

  const startedCategories = categories.filter((c) =>
    ['IN_PROGRESS', 'COMPLETED'].includes(c.status),
  );

  // Si aucune sélection explicite, on affiche la première catégorie disponible.
  // "Tournoi complet" (null) n'est pertinent que s'il n'y a aucune catégorie.
  const effectiveCategoryId = selectedCategoryId ?? startedCategories[0]?.id ?? null;

  const getBracket = useQuery({
    queryKey: ['tournament', tournamentId, 'bracket', effectiveCategoryId],
    queryFn: () => bracketApi.getBracket(tournamentId, effectiveCategoryId),
    enabled: isActive,
  });

  const bracket = getBracket.data;
  const bracketMap = new Map();
  if (bracket?.rounds) {
    bracket.rounds.forEach(({ round, matches }) => bracketMap.set(round, matches));
  }

  const currentRoundMatches = bracketMap.get(currentRound) || [];
  const totalRounds = bracket?.totalRounds ?? 0;

  const finalRoundMatches = bracketMap.get(totalRounds) ?? [];
  const finalMatch = finalRoundMatches.find((m) => m.position === 0) ?? finalRoundMatches[0];
  const champion = finalMatch?.winnerId
    ? registrations.find((r) => r.competitor.id === finalMatch.winnerId)?.competitor?.name
    : null;

  const silverParticipant = finalMatch?.winnerId
    ? finalMatch.participants.find((p) => p.competitorId !== finalMatch.winnerId)
    : null;
  const silver = silverParticipant
    ? registrations.find((r) => r.competitor?.id === silverParticipant.competitorId)?.competitor?.name ?? null
    : null;

  // Bronze unique : vainqueur de la petite finale (round = totalRounds, position 1).
  const petiteFinale = finalRoundMatches.find((m) => m.position === 1);
  const bronze = petiteFinale?.winnerId
    ? registrations.find((r) => r.competitor?.id === petiteFinale.winnerId)?.competitor?.name ?? null
    : null;

  const recordResultMutation = useMutation({
    mutationFn: ({ matchId, winnerId }) => matchesApi.recordResult(tournamentId, matchId, winnerId),
    onSuccess: () => {
      setSelectedMatch(null);
      setPendingResult(null);
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId, 'bracket'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId], exact: true });
      toastSuccess('Résultat enregistré');
    },
    onError: (e) => toastError(e.error || "Erreur lors de l'enregistrement du résultat"),
  });

  const handleCategoryChange = (value) => {
    setSelectedCategoryId(value);
    setCurrentRound(1);
    setSelectedMatch(null);
  };

  const handleExportPDF = async () => {
    if (!bracketMap.size) return;
    setIsExporting(true);
    setShowExportDialog(false);
    try {
      const { exportBracketPDF } = await import('@/lib/bracketPDFExport.js');
      const categoryName = startedCategories.find((c) => c.id === effectiveCategoryId)?.name ?? 'Bracket';
      await exportBracketPDF({
        bracketMap,
        totalRounds,
        categoryName,
        tournamentName,
        lieu: exportForm.lieu,
        date: exportForm.date,
        aire: aireByCat[effectiveCategoryId] ?? '',
      });
    } catch (err) {
      toastError(err?.message || "Erreur lors de la génération du PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAllPDF = async () => {
    if (startedCategories.length === 0) return;
    setIsExporting(true);
    setShowExportDialog(false);
    try {
      const { exportAllBracketsPDF } = await import('@/lib/bracketPDFExport.js');
      const categoriesData = await Promise.all(
        startedCategories.map(async (cat) => {
          const data = await bracketApi.getBracket(tournamentId, cat.id);
          const map  = new Map();
          if (data?.rounds) data.rounds.forEach(({ round, matches }) => map.set(round, matches));
          return {
            bracketMap: map,
            totalRounds: data?.totalRounds ?? 0,
            categoryName: cat.name,
            aire: aireByCat[cat.id] ?? '',
          };
        }),
      );
      await exportAllBracketsPDF({
        categories: categoriesData,
        tournamentName,
        lieu: exportForm.lieu,
        date: exportForm.date,
      });
    } catch (err) {
      toastError(err?.message || "Erreur lors de la génération du PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isActive) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground border rounded-lg">
        <Trophy className="h-10 w-10" aria-hidden="true" />
        <div className="text-center space-y-1">
          <p className="font-medium text-foreground">Tournoi pas encore démarré</p>
          <p className="text-sm">
            Le bracket se génère au démarrage du tournoi. Vérifiez vos inscriptions
            et vos catégories, puis démarrez le tournoi depuis l'onglet&nbsp;<strong>Général</strong>.
          </p>
        </div>
        {onSwitchTab && (
          <Button variant="outline" size="sm" onClick={() => onSwitchTab('general')}>
            Aller à l'onglet Général
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de catégorie + export PDF */}
      {startedCategories.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground shrink-0">Afficher :</span>
            <Select
              value={effectiveCategoryId}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {startedCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {bracketMap.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={() => setShowExportDialog(true)}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? 'Export en cours…' : 'Exporter PDF'}
            </Button>
          )}
        </div>
      )}

      {/* État vide — aucune catégorie démarrée */}
      {startedCategories.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-14 text-muted-foreground border rounded-lg">
          <Tag className="h-10 w-10" aria-hidden="true" />
          <div className="text-center space-y-1">
            <p className="font-medium text-foreground">Aucune catégorie démarrée</p>
            <p className="text-sm">
              Ouvrez une catégorie et lancez-la pour générer son bracket.
            </p>
          </div>
          {onSwitchTab && (
            <Button variant="outline" size="sm" onClick={() => onSwitchTab('categories')}>
              Gérer les catégories
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
        </div>
      )}

      {/* Champion */}
      {champion && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {effectiveCategoryId
                  ? `Champion — ${startedCategories.find((c) => c.id === effectiveCategoryId)?.name}`
                  : 'Champion'}
              </p>
              <p className="text-xl font-bold text-primary">{champion}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Argent — finaliste perdant */}
      {silver && (
        <Card className="border-slate-300/50 bg-slate-50/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Medal className="h-6 w-6 text-slate-400 shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Argent</p>
              <p className="text-base font-semibold text-slate-500">{silver}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bronze — vainqueur de la petite finale */}
      {bronze && (
        <Card className="border-orange-300/50 bg-orange-50/30">
          <CardContent className="flex items-center gap-3 py-4">
            <Medal className="h-6 w-6 text-orange-500 shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bronze</p>
              <p className="text-base font-semibold text-orange-600">{bronze}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {getBracket.isError && (
        <p className="text-sm text-destructive">Impossible de charger le bracket.</p>
      )}

      {/* État vide — bracket chargé mais vide */}
      {startedCategories.length > 0 && !getBracket.isLoading && !getBracket.isError && totalRounds === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          Bracket non disponible pour cette catégorie.
        </p>
      )}

      {/* Navigation rounds */}
      {totalRounds > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: totalRounds }).map((_, i) => (
            <Button
              key={i}
              variant={currentRound === i + 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setCurrentRound(i + 1); setSelectedMatch(null); }}
            >
              {i + 1 === totalRounds ? 'Finale' : `Round ${i + 1}`}
            </Button>
          ))}
        </div>
      )}

      {/* Table des matchs — desktop */}
      {currentRoundMatches.length > 0 && (
        <div className="hidden md:block rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                <th className="px-4 py-2.5 text-left font-medium">Participant 1</th>
                <th className="px-4 py-2.5 text-left font-medium">Participant 2</th>
                <th className="px-4 py-2.5 text-left font-medium">Vainqueur</th>
                <th className="px-4 py-2.5 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentRoundMatches.map((match) => {
                const cfg = MATCH_STATUS_CONFIG[match.status] || { label: match.status, className: '' };
                const StatusIcon = cfg.icon;
                const isPetiteFinale = currentRound === totalRounds && match.position === 1;
                const winner = match.winnerId
                  ? match.participants.find((p) => p.competitorId === match.winnerId)?.competitor
                  : null;
                return (
                  <tr key={match.id} className={`bg-background hover:bg-muted/30 transition-colors ${ROW_CLASS[match.status] ?? ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge className={cfg.className}>
                          {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                          {cfg.label}
                        </Badge>
                        {isPetiteFinale && (
                          <span className="text-xs font-medium text-orange-600">Petite finale · bronze</span>
                        )}
                      </div>
                    </td>
                    {[0, 1].map((slot) => {
                      const p = match.participants[slot];
                      const reg = registrations.find((r) => r.competitor?.id === p?.competitorId);
                      return (
                        <td key={slot} className="px-4 py-3">
                          {p?.competitor ? (
                            <div className="flex flex-col gap-0.5">
                              <span>{p.competitor.name}</span>
                              <div className="flex items-center gap-1">
                                {reg?.seed && <span className="text-xs text-muted-foreground">(#{reg.seed})</span>}
                                <CompetitorTypeBadge type={p.competitor.type} />
                              </div>
                            </div>
                          ) : '—'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      {winner ? (
                        <div className="flex items-center gap-1 font-semibold text-primary">
                          <Trophy className="h-4 w-4" />{winner.name}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {match.status === 'READY' && (
                        <Button size="sm" onClick={() => setSelectedMatch(match)}>
                          <Pencil className="h-4 w-4 mr-1" />Saisir résultat
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Matchs — cartes mobile */}
      {currentRoundMatches.length > 0 && (
        <div className="md:hidden space-y-2">
          {currentRoundMatches.map((match) => {
            const cfg = MATCH_STATUS_CONFIG[match.status] || { label: match.status, className: '' };
            const StatusIcon = cfg.icon;
            const isPetiteFinale = currentRound === totalRounds && match.position === 1;
            const winner = match.winnerId
              ? match.participants.find((p) => p.competitorId === match.winnerId)?.competitor
              : null;
            return (
              <div
                key={match.id}
                className={`rounded-lg border bg-background p-3 space-y-2 ${ROW_CLASS[match.status] ?? ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cfg.className}>
                      {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                      {cfg.label}
                    </Badge>
                    {isPetiteFinale && (
                      <span className="text-xs font-medium text-orange-600">Petite finale · bronze</span>
                    )}
                  </div>
                  {match.status === 'READY' && (
                    <Button size="sm" onClick={() => setSelectedMatch(match)}>
                      <Pencil className="h-4 w-4 mr-1" />Saisir résultat
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  {[0, 1].map((slot) => {
                    const p = match.participants[slot];
                    const reg = registrations.find((r) => r.competitor?.id === p?.competitorId);
                    const isWinner = winner && p?.competitorId === match.winnerId;
                    return (
                      <div
                        key={slot}
                        className={`flex items-center gap-1.5 text-sm ${isWinner ? 'font-semibold text-primary' : ''}`}
                      >
                        {isWinner && <Trophy className="h-4 w-4 shrink-0" />}
                        {p?.competitor ? (
                          <>
                            <span>{p.competitor.name}</span>
                            {reg?.seed && <span className="text-xs text-muted-foreground">(#{reg.seed})</span>}
                            <CompetitorTypeBadge type={p.competitor.type} />
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Saisie résultat */}
      {selectedMatch && (
        <Card>
          <CardHeader><CardTitle>Sélectionner le vainqueur</CardTitle></CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            {selectedMatch.participants.filter((p) => p.competitor).map((p) => {
              const reg = registrations.find((r) => r.competitor?.id === p.competitorId);
              return (
                <div key={p.slot} className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    {reg?.seed && <span className="text-xs text-muted-foreground">(#{reg.seed})</span>}
                    <CompetitorTypeBadge type={p.competitor.type} />
                  </div>
                  <Button onClick={() => setPendingResult({ matchId: selectedMatch.id, winnerId: p.competitorId, winnerName: p.competitor.name })}>
                    {p.competitor.name}
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" className="self-end" onClick={() => setSelectedMatch(null)}>Annuler</Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!pendingResult} onOpenChange={(open) => !open && setPendingResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le résultat</AlertDialogTitle>
            <AlertDialogDescription>
              Déclarer <strong>{pendingResult?.winnerName}</strong> vainqueur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => recordResultMutation.mutate({ matchId: pendingResult.matchId, winnerId: pendingResult.winnerId })}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vue d'ensemble */}
      {bracketMap.size > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-6">Vue d'ensemble</h2>
          <BracketView bracketMap={bracketMap} totalRounds={totalRounds} />
        </>
      )}

      {/* Modal export PDF */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Exporter en PDF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="export-lieu">Lieu</Label>
              <Input
                id="export-lieu"
                placeholder="ex : Salle Omnisports de Paris"
                value={exportForm.lieu}
                onChange={(e) => setExportForm({ ...exportForm, lieu: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-date">Date</Label>
              <Input
                id="export-date"
                type="date"
                value={exportForm.date}
                onChange={(e) => setExportForm({ ...exportForm, date: e.target.value })}
              />
            </div>
            {startedCategories.length > 1 ? (
              <div className="space-y-1.5">
                <Label>Aire n° par catégorie</Label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {startedCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <span className="flex-1 text-sm truncate" title={cat.name}>{cat.name}</span>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Aire n°"
                        className="h-8 w-24"
                        value={aireByCat[cat.id] ?? ''}
                        onChange={(e) => setAireByCat((m) => ({ ...m, [cat.id]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="export-aire">Aire n°</Label>
                <Input
                  id="export-aire"
                  type="number"
                  min={1}
                  placeholder="ex : 1"
                  value={aireByCat[effectiveCategoryId] ?? ''}
                  onChange={(e) => setAireByCat((m) => ({ ...m, [effectiveCategoryId]: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="sm:mr-auto" onClick={() => setShowExportDialog(false)}>
              Annuler
            </Button>
            <Button variant="outline" disabled={isExporting} onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              Cette catégorie
            </Button>
            {startedCategories.length > 1 && (
              <Button disabled={isExporting} onClick={handleExportAllPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                Toutes ({startedCategories.length} pages)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BracketsTab;
