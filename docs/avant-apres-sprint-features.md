# Sprint Features — Avant / Après

> Document technique décrivant le **delta du sprint « import CSV, export PDF professionnel,
> reset des tirages & correctifs prod »** entre l'état d'avant et l'état livré.
> (Sprint *fonctionnel* qui précède le [sprint performance](./avant-apres-sprint-perf.md).)
>
> Plage : `bacec9d` (avant) → `a5be0d7` (fin du sprint) · **28 commits**, ~3 900 lignes.

## TL;DR

| Thème | Avant | Après |
|-------|-------|-------|
| **Authentification** | Aucune (back-office ouvert) | **Login JWT** + routes API protégées |
| **Saisie des inscriptions** | Une par une, à la main | **+ Import CSV** (modèle, prévisualisation, détection d'erreurs) |
| **Genres à l'import** | `Male` / `Female` uniquement | + reconnaissance **`garçon`/`fille`** |
| **Export PDF** | Aucun export dédié | **Export PDF professionnel** (1 feuille/catégorie, paysage) |
| **Fin d'une catégorie** | 🐛 Terminait **tout le tournoi** | Termine **uniquement la catégorie** |
| **Réinitialiser une catégorie** | 🐛 Repassait en brouillon, non redémarrable | Repasse en **Ouvert**, redémarrable |
| **3ᵉ place** | — | **Petite finale** (médaille de bronze unique) + **repêchage** vierge |
| **Lancer les catégories** | Une par une | **Ouvrir / Démarrer toutes** les catégories |
| **Mobile** | Inutilisable (tableaux qui débordent) | **Responsive** (cartes, onglets scrollables) |
| **Vocabulaire UI** | « bracket » | « **tirage** » |
| **Schéma** | — | + champ `club`, + contrainte unique `(name, birthYear)` |

---

## 1. Authentification (JWT) — *nouveau*

**Fichiers (nouveaux)** : `src/auth/auth.router.js`, `src/middleware/authMiddleware.js`,
`frontend/src/pages/Login.jsx`, `frontend/src/components/ProtectedRoute.jsx`,
`frontend/src/lib/auth.js` · **dépendance** : `jsonwebtoken`.

- **Avant** : aucune authentification — l'API et le back-office étaient accessibles sans login.
- **Après** : `POST /api/v1/auth/login` (identifiants admin via variables d'environnement
  `ADMIN_USER`/`ADMIN_PASSWORD`) renvoie un **JWT** (30 j). Les routes `/competitors` et
  `/tournaments` passent par un middleware `requireAuth`. Côté front, `ProtectedRoute` redirige
  vers `/login`, le token est injecté en `Authorization: Bearer` sur chaque requête, et un 401
  déclenche la déconnexion automatique.

---

## 2. Import CSV des inscriptions — *nouveau*

**Fichiers** : `src/registrations/registrations.import.service.js` (nouveau, +222),
`frontend/src/pages/tabs/InscriptionsTab.jsx` (gros remaniement), `registrations.router.js`.

- **Avant** : les inscriptions se saisissaient **une par une**. Importer une liste de club
  signifiait tout recopier.
- **Après** : import **CSV** complet avec :
  - **modèle CSV téléchargeable** pour cadrer le format attendu ;
  - **prévisualisation** avant validation (stats : reconnus / en erreur / doublons) ;
  - **détection et export des erreurs** (genre non reconnu, date invalide, année hors limites) ;
  - **upsert atomique** des compétiteurs (`name`+`birthYear`) — élimine une race condition et met
    à jour genre/club depuis le CSV ;
  - **affectation automatique** à la catégorie (âge × genre) avec **quota** par catégorie et
    bascule en **liste d'attente** si pleine ;
  - reconnaissance des genres **`garçon` → Male** et **`fille` → Female** (en plus de Male/Female).

---

## 3. Export PDF professionnel — *nouveau*

**Fichier** : `frontend/src/lib/bracketPDFExport.js` (nouveau, +525) · **dépendance** : `jspdf`.

- **Avant** : pas d'export PDF dédié des tirages.
- **Après** : génération d'un **PDF paysage A4**, prêt à imprimer, **une feuille par catégorie** :
  - **absorption des BYE** (les exempts du tour préliminaire sont fusionnés visuellement → moins
    de cases vides quand il y a beaucoup de byes) ;
  - **noms centrés** dans les cases, taille de police adaptative ;
  - **footer compacté** pour gagner de la place ;
  - **lisibilité noir & blanc** : lettres **B**/**R** dans les bandeaux ;
  - **date / lieu** en coin haut-gauche, info-bar superflue retirée ;
  - **n° d'aire par catégorie** lors de l'export multi-catégories ;
  - **feuille de repêchage vierge** par catégorie (perdants des tours préliminaire + 1er tour),
    générée vide pour remplissage manuel.

---

## 4. Cycle de vie des tirages **par catégorie** — correctifs prod + nouvelles actions

**Fichiers** : `src/matches/matches.service.js` (~152 lignes), `src/categories/categories.service.js`,
`src/bracket/generators/singleElim.js`, `frontend/src/pages/tabs/CategoriesTab.jsx`,
`frontend/src/pages/tabs/BracketsTab.jsx`.

### 4.1 Deux bugs prod corrigés (commit `e1b6e49`)
- **Avant 🐛** : terminer la finale d'**une** catégorie passait **tout le tournoi** en *Terminé*.
  **Après** : une catégorie n'est marquée *Terminée* que lorsqu'il ne reste plus de combat en
  attente **dans cette catégorie** ; le tournoi entier n'est *Terminé* que quand **toutes** les
  catégories (non annulées) le sont.
- **Avant 🐛** : réinitialiser une catégorie d'un tournoi démarré la repassait en **brouillon**
  → impossible de la redémarrer. **Après** : `resetCategory` la repasse en **Ouvert** (et
  ré-bascule le tournoi en *En cours* s'il était passé *Terminé*) → redémarrable.

### 4.2 Petite finale (commit `53aa7cf`)
- **Avant** : pas de gestion dédiée de la 3ᵉ place.
- **Après** : une **petite finale** entre les perdants des demi-finales détermine **une seule
  médaille de bronze** (avec gestion du walkover quand une demi est un BYE).

### 4.3 Actions groupées (commits `77e4dca`, `dced25b`)
- **Avant** : on ouvrait puis démarrait les catégories **une par une** (répétitif).
- **Après** : boutons **« Ouvrir toutes les catégories »** et **« Démarrer toutes les catégories »**
  (génère tous les tirages d'un coup, avec remontée des éventuels échecs par catégorie).

### 4.4 Renommage (commit `9160a8f`)
- **Avant** : libellés « bracket ». **Après** : « **tirage** » dans toute l'UI.

---

## 5. Responsive mobile (commit `c4bccf8`)

**Fichiers** : `Layout.jsx`, `components/ui/tabs.jsx`, `BracketView.jsx`, les 3 onglets
(`InscriptionsTab`, `CategoriesTab`, `BracketsTab`).

- **Avant** : fluide sur ordinateur mais **cassé sur mobile** (tableaux 5-7 colonnes qui débordent,
  barre d'onglets coupée, header sur une ligne).
- **Après** : passe **mobile-first** —
  - tableaux → **cartes empilées** sous le breakpoint `md` (tableau conservé en desktop) ;
  - barre d'onglets **scrollable horizontalement** ;
  - **header compact** (titre raccourci, bouton en icône seule) ;
  - `BracketView` plus compact + aide « ← faites défiler → » + recalcul des liens au `resize`.

---

## 6. Robustesse & correctifs divers

- **Chunk obsolète après déploiement** (`82b1c91`) : un onglet déjà ouvert référençait d'anciens
  chunks (hash modifié) → `Failed to fetch dynamically imported module`. Garde-fou : rechargement
  automatique unique sur l'événement `vite:preloadError` (`frontend/src/main.jsx`).
- **Routing SPA sur Vercel** (`b6f656d`) : `vercel.json` ajusté pour servir `index.html` (les
  routes profondes ne renvoient plus 404).
- **États vides guidés** (`aac8c80`) dans `BracketsTab`, **validation inline** des formulaires.
- **Garde-fous d'inscription** (`b797be5`) : quota catégorie + contrôle de l'année de naissance.
- **Édition du seed** (`a5be0d7`) : autorisée tant que le tournoi n'est pas terminé/annulé, avec
  **unicité du seed par catégorie** (et non plus à l'échelle du tournoi).

---

## 7. Schéma de données

Deux migrations Prisma ajoutées dans ce sprint :
- `20260527195326_add_club_to_competitor` — champ **`club`** sur le compétiteur (affiché/importé) ;
- `20260528000000_add_competitor_unique_name_birthyear` — **contrainte unique `(name, birthYear)`**
  (support de l'upsert atomique à l'import, anti-doublons).

---

## 8. Ce qui n'a **pas** changé

- **Stack & hébergement** : toujours React/Vite (Vercel) + Express/Prisma (Heroku, région `us` à
  l'époque — la migration `eu` est l'objet du [sprint suivant](./avant-apres-sprint-perf.md)).
- **Format des tournois** : élimination simple (single-elim) et round-robin déjà en place.
- **Modèle catégories** : âge × genre déjà présent (ce sprint en corrige le cycle de vie et les
  actions, sans le réinventer).

---

## 9. Références

- Plage de commits : `bacec9d..a5be0d7` (28 commits).
- Commits clés : `f3eb68c` (drop initial), `d671be4` (auth JWT), `e1b6e49` (fix completion/reset
  par catégorie), `53aa7cf` (petite finale), `77e4dca`/`dced25b` (ouvrir/démarrer tout),
  `38f27bd` (repêchage), `ee73111`/`2fc7f92` (PDF), `c4bccf8` (responsive), `818a698`
  (genres garçon/fille).
- Fichiers nouveaux majeurs : `frontend/src/lib/bracketPDFExport.js`,
  `src/registrations/registrations.import.service.js`, `src/auth/auth.router.js`,
  `src/middleware/authMiddleware.js`, `frontend/src/pages/Login.jsx`.
- Documentation technique générale : [Wiki GitHub](https://github.com/chokrikadoussi/tournament-manager/wiki).
