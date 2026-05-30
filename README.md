# Tournament Manager

**Application web de gestion de tournois de Taekwondo** — des inscriptions aux médailles, en passant par les tirages et le suivi des combats en temps réel.

🥋 **Application en ligne :** [tournoi.chokri.tech](https://tournoi.chokri.tech)

---

## À quel besoin répond ce projet ?

Organiser un tournoi de Taekwondo dans un club, c'est aujourd'hui un casse-tête largement géré **au papier et au tableur** :

- les **inscriptions** arrivent en vrac (mails, listes Excel de chaque club) et doivent être recopiées à la main ;
- il faut **répartir les combattants par catégorie** (âge × genre), compter les effectifs, gérer les listes d'attente ;
- les **tirages au sort** se dessinent à la main sur des feuilles — long, source d'erreurs, et impossible à refaire proprement si un combattant se désiste ;
- le jour J, au **bord du tatami**, on suit les combats sur des feuilles volantes, on raye, on recalcule les médailles…

Résultat : du temps perdu, des erreurs de placement, des feuilles illisibles, et une expérience stressante pour les organisateurs.

**Tournament Manager remplace tout ce processus par un outil unique**, du brouillon du tournoi jusqu'au palmarès final.

---

## La solution

Une application web qui couvre **tout le cycle de vie d'une compétition** :

| Besoin | Réponse de l'application |
|--------|--------------------------|
| Centraliser les inscriptions | Saisie unitaire **ou import CSV** (avec prévisualisation, détection des erreurs, fusion/remplacement) |
| Répartir par catégorie | Catégories **âge × genre**, affectation automatique, gestion de la **liste d'attente** et des quotas |
| Faire les tirages sans erreur | **Tirage automatique** avec têtes de série réparties proprement et gestion des exempts (byes) |
| Gérer la 3ᵉ place | **Petite finale** pour une médaille de bronze + **feuille de repêchage** vierge pour la 2ᵉ bronze |
| Suivre les combats en direct | Saisie des résultats tour par tour, **progression automatique** des vainqueurs, médailles calculées seules |
| Travailler au bord du tatami | Interface **responsive mobile**, pensée pour le smartphone pendant la compétition |
| Officialiser les tirages | **Export PDF** prêt à imprimer (une feuille par catégorie, format paysage, n° d'aire) |
| Plusieurs catégories en parallèle | Chaque catégorie a son **tirage indépendant** et son propre cycle de vie |

---

## Pour qui ?

- **Clubs et organisateurs** de tournois de Taekwondo (et plus largement de sports de combat à élimination directe).
- **Arbitres / table de marque** qui saisissent les résultats au fil des combats.
- Adaptable à d'autres sports à brackets (le moteur gère l'élimination simple et le round robin).

---

## Bénéfices concrets

- ⏱️ **Gain de temps** — fini la recopie manuelle et le dessin des tirages à la main.
- ✅ **Moins d'erreurs** — placement des têtes de série, exempts et médailles automatisés.
- 🔁 **Souplesse** — un désistement ? On réinitialise et on régénère le tirage en un clic.
- 📄 **Feuilles propres** — tirages PDF lisibles, imprimables, professionnels.
- 📱 **Mobilité** — utilisable depuis un téléphone, au bord du tatami.

---

## Documentation technique

L'architecture, la stack, le modèle de données et la référence d'API sont décrits dans le **[Wiki GitHub](https://github.com/chokrikadoussi/tournament-manager/wiki)**.
