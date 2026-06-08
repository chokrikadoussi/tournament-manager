# Sprint Performance — Avant / Après

> Document technique décrivant le **delta entre la version prod d'avant ce sprint et
> la version actuelle**. Pour le détail opérationnel de la migration infra, voir
> [`migration-eu.md`](./migration-eu.md).
>
> Date : 2026-05-30 · Commits : `9d8f9bc`, `58350eb` (+ docs `ce29a2c`, `6ef4668`).

## TL;DR

| Domaine | Avant | Après |
|---------|-------|-------|
| Région backend | Heroku **`us`** (AWS us-east) | Heroku **`eu`** (AWS eu-west, Irlande) |
| App Heroku | `open-taekwondo-api` | `open-taekwondo-api-eu` |
| Dyno web | Standard-1X (~25 $/mois) | **Basic** (~7 $/mois) |
| Base de données | `essential-0` en us-east | `essential-0` en eu-west (données identiques) |
| Compression HTTP API | ❌ absente | ✅ `compression` (gzip) |
| Lecture d'un tirage (`getBracket`) | N requêtes SQL (1 par round) | **1 requête** groupée |
| Timeout requêtes front (axios) | **10 s** | **30 s** |
| Latence API à chaud (mesurée) | ~370 ms | **~110 ms** |
| Cible API du front (`VITE_API_URL`) | URL app us | URL app eu |

**Aucun changement** de fonctionnalité, de schéma de données, de contrat d'API ni d'UI.
C'est un sprint purement infra + performance.

---

## 1. Contexte — le problème de départ

Symptômes rapportés en prod :
- « le site rame » ;
- « on doit recharger la page plusieurs fois » avant que ça réponde.

Deux causes racines distinctes ont été identifiées **par la mesure** (et non supposées) :

| Cause | Mesure | Conséquence ressentie |
|-------|--------|------------------------|
| **Latence géographique** | TTFB à chaud ~370 ms (stack en us-east, utilisateur en France) | « ça rame » : chaque requête paie l'aller-retour transatlantique |
| **Cold boot dyno > timeout front** | 1er hit après redémarrage = **~9-11 s** ; timeout axios = **10 s** | « il faut recharger » : la 1ʳᵉ requête après un redémarrage expirait |

> Le dyno Heroku redémarre **à chaque déploiement** + **une fois par 24 h** (cycle automatique).
> Au 1ᵉʳ hit suivant, l'app paie le cold boot (init Node + Prisma + connexion DB). Comme il
> dépassait le timeout de 10 s, l'utilisateur voyait une erreur et rechargeait.

---

## 2. Changements détaillés

### 2.1 — Infra : migration de région `us` → `eu`

**Avant** : toute la stack (dyno + base) en **us-east**. **Après** : tout en **eu-west** (Irlande),
géographiquement proche de la France.

- Nouvelle app `open-taekwondo-api-eu` (région `eu`, stack heroku-24), base `essential-0`
  provisionnée en eu, **données migrées à l'identique** (2 tournois, 175 compétiteurs,
  349 inscriptions, 512 matchs, 20 catégories — comptes vérifiés égaux).
- **Dyno passé de Standard-1X à Basic** : Basic ne dort jamais et 512 Mo suffisent ici ; le
  preboot (réservé à Standard) devient inutile une fois le timeout front corrigé → **−18 $/mois**.
- **Bascule** : la variable Vercel `VITE_API_URL` pointe désormais sur l'URL de l'app eu.
- **Remotes git réorganisés** : `heroku` → app **eu** (déploiements futurs),
  `heroku-us-old` → ancienne app us (rollback temporaire).

**Mesure** (depuis un même point) : latence API à chaud **~370 ms → ~110 ms** (~3,3× plus rapide).

> Note : le **cold boot reste ~9-11 s** des deux côtés (c'est de l'init applicative, pas de la
> géographie). La migration ne le corrige pas — c'est le §2.4 qui s'en charge.

### 2.2 — Backend : compression HTTP

**Fichier** : `src/index.js` · **dépendance** : `compression`

```diff
  app.use(helmet());
+ app.use(compression());
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
```

**Avant** : les réponses JSON étaient envoyées non compressées.
**Après** : `compression` gzip les réponses au-dessus du seuil de 1 ko. Gain surtout sensible sur
les **grosses listes** (ex. les inscriptions d'un tournoi). Les petites réponses ne sont pas
compressées (seuil), comportement normal.

### 2.3 — Backend : suppression d'un N+1 dans `getBracket`

**Fichier** : `src/bracket/bracket.service.js`

**Avant** — une requête SQL **par round**, dans une boucle (pour un tableau à 8 rounds = 8 requêtes) :

```js
const rounds = [];
for (let round = 1; round <= totalRounds; round++) {
  const matches = await prisma.match.findMany({
    where: { ...matchWhere, round },
    select: { /* ... */ },
    orderBy: { position: 'asc' },
  });
  rounds.push({ round, matches });
}
```

**Après** — **une seule** requête, regroupement par round côté application :

```js
const allMatches = await prisma.match.findMany({
  where: matchWhere,
  select: { id: true, round: true, position: true, status: true, winnerId: true,
    participants: { select: { slot: true, competitorId: true,
      competitor: { select: { name: true } } } } },
  orderBy: [{ round: 'asc' }, { position: 'asc' }],
});
const rounds = [];
for (let round = 1; round <= totalRounds; round++) {
  rounds.push({ round, matches: allMatches.filter((m) => m.round === round) });
}
```

> **Portée honnête** : ces requêtes étaient dyno↔base **co-localisés** (~ms chacune), donc le gain
> côté latence ressentie est faible. C'est avant tout une amélioration d'**hygiène** et de **charge
> DB** (1 aller-retour au lieu de N). La réponse renvoyée est identique (champ `round` ajouté à
> chaque match, additif et sans impact côté front).

### 2.4 — Frontend : timeout axios 10 s → 30 s (le vrai fix du « reload »)

**Fichier** : `frontend/src/api/axios.js`

```diff
- export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1', timeout: 10_000 });
+ // timeout 30s : au 1er hit après un redémarrage de dyno (déploiement ou cycle
+ // quotidien Heroku), le cold boot prend ~9-11s. Un timeout à 10s faisait échouer
+ // cette 1ère requête → l'utilisateur devait recharger. 30s couvre le cold boot.
+ export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1', timeout: 30_000 });
```

**Avant** : la 1ʳᵉ requête après un redémarrage de dyno (cold boot ~9-11 s) dépassait le timeout
de 10 s → erreur → rechargement manuel.
**Après** : 30 s de marge → le cold boot passe sans erreur. **Plus de « reload » forcé.**

---

## 3. Impacts

| Axe | Effet |
|-----|-------|
| **Performance à chaud** | ~3× plus rapide pour un utilisateur proche de l'Europe (mesuré ~370→110 ms) |
| **Robustesse au cold boot** | Plus d'échec/reload après déploiement ou cycle quotidien du dyno |
| **Charge DB** | 1 requête au lieu de N pour l'affichage d'un tirage |
| **Bande passante** | Réponses JSON volumineuses compressées (gzip) |
| **Coût** | −18 $/mois à terme (dyno Basic) une fois l'app us détruite ; surcoût négligeable pendant le chevauchement |

---

## 4. Ce qui n'a **pas** changé

- **Contrat d'API** : mêmes endpoints, mêmes formes de réponse (ajout additif du champ `round`
  dans les objets match du tirage).
- **Données** : migrées à l'identique (comptes vérifiés égaux entre us et eu).
- **Schéma & migrations Prisma** : les 6 mêmes migrations, ré-appliquées sur la base eu.
- **Authentification** : même mécanisme JWT, mêmes identifiants admin (config vars recopiées).
- **Fonctionnalités & UI** : aucun changement côté produit (responsive, tirages, PDF, etc.).

---

## 5. Reste à faire (post-sprint)

1. **Observer 3-7 jours** la prod eu, puis **détruire l'app us** :
   `heroku apps:destroy open-taekwondo-api --confirm open-taekwondo-api` + `git remote remove heroku-us-old`.
   ⚠️ Le rollback (repointer `VITE_API_URL` sur us + redeploy) n'est sûr **que tant que eu n'a pas
   accumulé d'écritures**.
2. **(Recommandé)** Domaine custom `api.chokri.tech` sur l'app eu → futures migrations DNS-only.
3. **Pistes non traitées** (dé-scopées) : réduire le nombre de requêtes par page (fan-out),
   alléger le bundle front (chunk `toast` ~91 ko, deux librairies d'icônes `@hugeicons` + `lucide-react`).

---

## 6. Références

- Commits : `9d8f9bc` (compression + N+1), `58350eb` (timeout axios).
- Fichiers : `src/index.js`, `src/bracket/bracket.service.js`, `frontend/src/api/axios.js`, `package.json`.
- Runbook infra détaillé : [`migration-eu.md`](./migration-eu.md).
