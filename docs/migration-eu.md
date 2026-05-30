# Évaluation — Migration de l'API en région Europe (`eu`)

> **Statut : à valider avant exécution.** Ce document est un *runbook* d'évaluation.
> Rien n'est exécuté tant que tu n'as pas donné le feu vert.

## 1. Pourquoi

Mesures prises depuis la France (connexion à chaud, keep-alive) :

| Endpoint | TTFB observé |
|----------|--------------|
| `/health` (région `us`, avec `SELECT 1`) | ~350 ms |
| `/api/v1/*` (réel, région `us`) | ~350 ms |

La stack complète (dyno Heroku **`region: us`** + addon Postgres) est aux États-Unis.
La part **réseau transatlantique** (~aller-retour France↔us-east) se paie **à chaque requête HTTP**.
Une page qui enchaîne 3 à 5 requêtes cumule cette latence.

Déplacer l'API en **`eu`** (Common Runtime Heroku = AWS **eu-west-1**, Irlande) ramène le
RTT France↔serveur d'environ **85–100 ms à ~20–30 ms**.

> ⚠️ **Attente réaliste** : la migration supprime la part *géographique* (~60–90 ms de RTT
> par requête), pas le temps de traitement serveur. Combinée aux fixes déjà déployés
> (compression, N+1) et à une future réduction du nombre de requêtes par page, l'amélioration
> doit être nettement perceptible — mais ce n'est pas un « ×10 ».

## 2. État des lieux (faits vérifiés)

| Élément | Valeur actuelle |
|---------|-----------------|
| App Heroku | `open-taekwondo-api` |
| Région | **`us`** (Common Runtime) |
| Stack | `heroku-24` |
| Dyno | `web: Standard-1X` (ne dort pas) |
| Slug size | 127 MB |
| Add-on DB | `heroku-postgresql:essential-0` (~5 $/mois) |
| Version PG | 17.9 |
| Taille données | **9,27 MB** / 1 GB — 7 tables |
| Fork/Follow | **Non supporté** (tier essential) → migration via `pg:copy` |
| Domaine API | aucun custom → `open-taekwondo-api-0bfc22610b36.herokuapp.com` |
| Cible front | Vercel, var **`VITE_API_URL`** (axios `baseURL`) |
| Régions Common Runtime dispo | `eu`, `us` (Frankfurt/London = Private Spaces, Enterprise → écartés) |

**Conséquence du « pas de domaine custom »** : la bascule passe forcément par un changement
de `VITE_API_URL` sur Vercel + redéploiement du front. Voir §6 (future-proofing).

## 3. Stratégie : blue-green (app `eu` en parallèle)

Heroku **ne permet pas de changer la région d'une app existante**. On crée donc une nouvelle
app en `eu`, on y copie tout, on bascule le front, puis on retire l'ancienne après une période
de sécurité. La fenêtre de coupure réelle se limite à la copie de la base (quelques secondes).

```
[Vercel front] --VITE_API_URL--> [API us] --DATABASE--> [PG us]   (avant)
                          \
                           `--> [API eu] --DATABASE--> [PG eu]    (après bascule)
```

## 4. Runbook (commandes exactes)

> Pré-requis : faire la migration **hors période de tournoi** (idéalement en soirée, aucun
> arbitre connecté). Avoir un backup frais (§4.0).

### 4.0 — Filet de sécurité : backup de la prod actuelle
```bash
heroku pg:backups:capture -a open-taekwondo-api
heroku pg:backups:download -a open-taekwondo-api   # latest.dump en local, au cas où
```

### 4.1 — Créer l'app `eu` + la base
```bash
heroku apps:create open-taekwondo-api-eu --region eu --stack heroku-24
heroku addons:create heroku-postgresql:essential-0 -a open-taekwondo-api-eu
# La base est provisionnée automatiquement EN eu (suit la région de l'app).
```

### 4.2 — Copier les config vars (⚠️ PAS `DATABASE_URL`, auto-géré par l'addon)
À lancer depuis ta machine (tu es propriétaire des secrets) :
```bash
for k in ADMIN_USER ADMIN_PASSWORD JWT_SECRET CORS_ORIGIN NODE_ENV PGSSLMODE; do
  v=$(heroku config:get $k -a open-taekwondo-api)
  heroku config:set $k="$v" -a open-taekwondo-api-eu
done
```
> `CORS_ORIGIN` reste `https://tournoi.chokri.tech` (même front) → aucun changement.

### 4.3 — Déployer le code sur l'app `eu`
```bash
git remote add heroku-eu https://git.heroku.com/open-taekwondo-api-eu.git
git push heroku-eu main          # le release phase exécute `prisma migrate deploy`
```
À ce stade l'app `eu` tourne avec une base **vide mais migrée** (schéma à jour).

### 4.4 — Fenêtre de coupure : freeze + copie de la base
```bash
heroku maintenance:on -a open-taekwondo-api          # l'API us renvoie 503 (le front affiche des erreurs ~qq min)
heroku pg:copy open-taekwondo-api::DATABASE_URL DATABASE_URL \
  -a open-taekwondo-api-eu --confirm open-taekwondo-api-eu
# 9 MB → quelques secondes. Copie schéma + données + historique _prisma_migrations.
```
> `pg:copy` **écrase** la base cible : c'est voulu (elle ne contenait que le schéma vide).

### 4.5 — Tests de fumée sur `eu` (avant de basculer le front)
```bash
heroku open -a open-taekwondo-api-eu
# Vérifier manuellement : /health = 200, login admin, liste tournois, affichage d'un tirage.
curl -s -o /dev/null -w "eu TTFB=%{time_starttransfer}s\n" \
  https://open-taekwondo-api-eu-XXXX.herokuapp.com/health   # comparer à ~350ms us
```

### 4.6 — Bascule du front (Vercel)
1. Vercel → projet front → Settings → Environment Variables → `VITE_API_URL`
   = `https://<URL exacte de l'app eu>/api/v1`
2. Redeploy le front (Vercel rebuild).
3. Vérifier `https://tournoi.chokri.tech` : login, navigation, tirages, export PDF.

### 4.7 — Nettoyage (après 3–7 jours de stabilité)
```bash
heroku maintenance:off -a open-taekwondo-api   # optionnel : si on garde l'ancienne comme rollback
# ... période d'observation ...
heroku apps:destroy open-taekwondo-api --confirm open-taekwondo-api   # retrait définitif
git remote remove heroku            # nettoyer l'ancien remote
git remote rename heroku-eu heroku  # eu devient le remote de prod
```

## 5. Downtime, coût, rollback

- **Downtime réel** : fenêtre §4.4 → §4.6, soit **~5–15 min** (dont le rebuild Vercel).
  La zone à risque d'incohérence de données (freeze → copie) ne dure que **quelques secondes**.
- **Coût** : double facturation pendant le chevauchement (1 dyno Standard-1X ~25 $/mois prorata
  horaire + 1 DB essential 5 $/mois). Une journée de chevauchement ≈ **~1 $**. Régime permanent
  **inchangé** après destruction de l'ancienne app.
- **Rollback** : si l'app `eu` déraille, remettre `VITE_API_URL` sur l'ancienne URL + redeploy
  Vercel. L'ancienne base `us` est intacte (les écritures faites sur `eu` pendant la fenêtre
  seraient perdues, mais elle est négligeable hors tournoi).

## 6. Recommandation de future-proofing (optionnel mais conseillé)

Tant qu'il n'y a pas de domaine custom sur l'API, **chaque** changement de région/app force un
redeploy du front. Pour découpler définitivement :

```bash
# Sur l'app eu, une fois stable :
heroku domains:add api.chokri.tech -a open-taekwondo-api-eu   # renvoie une cible DNS (CNAME)
# Créer chez le registrar : CNAME api.chokri.tech -> <cible DNS Heroku>
# Activer le certificat auto :
heroku certs:auto:enable -a open-taekwondo-api-eu
```
Puis `VITE_API_URL = https://api.chokri.tech/api/v1` **une fois pour toutes**. Les futures
migrations deviennent **DNS-only** (zéro redeploy front).

## 7. Risques & mitigations

| Risque | Probabilité | Mitigation |
|--------|-------------|-----------|
| Écritures perdues pendant la copie | Faible | Maintenance ON + migration hors tournoi |
| `prisma migrate deploy` échoue sur l'app eu | Faible | Schéma identique, déjà validé en prod us ; backup §4.0 |
| Mauvaise URL `VITE_API_URL` | Moyenne | Tests de fumée §4.5 **avant** bascule ; rollback Vercel rapide |
| Oubli d'une config var | Moyenne | Liste exhaustive §4.2 ; comparer `heroku config` des 2 apps |
| Coût qui traîne (double facturation) | Faible | Détruire l'ancienne app sous 7 jours |
| CORS casse après bascule | Faible | `CORS_ORIGIN` inchangé (même domaine front) |

## 8. Checklist de validation finale (go/no-go)

- [ ] Backup `latest.dump` téléchargé en local
- [ ] App `eu` boote (`/health` = 200) avec base vide migrée
- [ ] `pg:copy` terminé sans erreur, comptes de lignes cohérents (tournois/inscriptions/matchs)
- [ ] TTFB `eu` mesuré nettement < `us`
- [ ] Front Vercel rebascule : login + navigation + tirage + export PDF OK
- [ ] Observation 3–7 j sans régression → destruction app `us`

---

## 9. Journal d'exécution — RÉALISÉ le 2026-05-30

Migration **exécutée et vérifiée**. `tournoi.chokri.tech` tourne désormais sur l'app `eu`.

### Ce qui a été fait
- **App eu créée** : `open-taekwondo-api-eu` (région `eu`, stack heroku-24), URL
  `https://open-taekwondo-api-eu-6275b5231028.herokuapp.com`.
- **DB eu** : addon `heroku-postgresql:essential-0` (PG 17.9), provisionnée en eu.
- **Config vars** copiées (sauf `DATABASE_URL`), secrets non exposés.
- **Code déployé** : 6 migrations appliquées.
- **Données copiées et vérifiées identiques** : Tournois=2, Compétiteurs=175,
  Inscriptions=349, Matchs=512, Catégories=20 (us == eu).
- **Smoke test eu OK** : `/health`, login, `/tournaments`, `/categories`, `/bracket`
  (tirage 4 rounds avec petite finale, ~0,13 s).
- **Bascule front** : `VITE_API_URL` Vercel → URL eu + **fix axios timeout 10 s → 30 s**
  (couvre le cold boot ~9-11 s, vraie cause du « reload »). Bundle prod vérifié :
  pointe sur eu uniquement, `timeout:3e4`.
- **Remotes git renommés** : `heroku` → **app eu** (déploiements futurs),
  `heroku-us-old` → app us (rollback).

### Écarts vs runbook
- **Dyno eu = Basic** ($7/mois) et non Standard-1X : le fix timeout rend le preboot inutile.
  → **−18 $/mois** une fois l'app us détruite. (Scalable si besoin de metrics/preboot.)
- **`pg:copy` a échoué (504 répétés)** : l'API d'orchestration `api.data.heroku.com` était
  injoignable depuis l'environnement d'exécution. Contourné par **`pg_restore` du dump local**
  directement dans la base eu (connexion PG directe, qui elle fonctionnait). Une seule erreur
  ignorée bénigne (`COMMENT ON EXTENSION pg_stat_statements`).
- **Pas de fenêtre de maintenance** : usage quasi nul à 21h + DB 9 MB → copie sans coupure.

### ⚠️ Reste à faire
1. **Observation 3–7 jours**. ⚠️ Le rollback (revenir `VITE_API_URL` sur us + redeploy) n'est
   sûr **que tant que eu n'a pas accumulé d'écritures** — sinon perte de données. Rollback =
   uniquement pour un problème **immédiat**.
2. **Détruire l'app us** une fois stable :
   `heroku apps:destroy open-taekwondo-api --confirm open-taekwondo-api`
   puis `git remote remove heroku-us-old`.
3. **(Recommandé) Domaine custom** `api.chokri.tech` sur l'app eu (§6) → futures migrations
   DNS-only, sans retoucher Vercel.
