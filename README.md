# Zeus Training

Carnet de musculation Upper/Lower, pensé pour être utilisé **d'une main, entre deux séries**, dans une salle mal éclairée et sans réseau.

Application web statique, installable sur l'écran d'accueil, **sans compte, sans serveur, sans suivi**. Toutes les données d'entraînement restent sur l'appareil.

---

## Ce que fait l'application

L'application est livrée avec un cycle Upper/Lower, mais **rien n'y est figé** : tout le contenu se modifie depuis l'app, sans toucher au code.

- **Aujourd'hui** — la prochaine séance du cycle Upper/Lower, calculée depuis l'historique, démarrable en un geste.
- **Mode séance** — validation série par série, correction rapide de la charge et des répétitions, minuteur de repos, remplacement d'un exercice quand la machine est prise, exercice passé, arrêt et reprise plus tard. Une séance partielle est enregistrée comme une séance normale.
- **Double progression prudente** — la cible ne monte que si toutes les séries ont atteint le haut de la fourchette sans être difficiles ; elle baisse de 10 % si une série est passée sous la fourchette ; elle est allégée de 10 % après trois semaines d'arrêt.
- **Programmes** — éditeur complet : créer, renommer, dupliquer et supprimer une séance, ajouter des exercices depuis un catalogue de 37 mouvements ou en créer sur mesure, les réordonner, régler séries, fourchette de répétitions, charges, repos, consignes et équivalents. Les quatre séances Upper/Lower fournies ne sont qu'un point de départ.
- **Progrès** — volume par séance, records personnels, séries en cours, historique complet. Aucun chiffre n'est inventé : sans séance, l'écran le dit.
- **Réglages** — thème, repos par défaut, vibrations, écran maintenu allumé, export / import de sauvegarde.

## Installation sur le téléphone

1. Ouvrir l'application dans Safari (iOS) ou Chrome (Android).
2. **Partager → Sur l'écran d'accueil** (iOS) ou **⋮ → Installer l'application** (Android).
3. Ouvrir Zeus depuis l'icône : plein écran, hors ligne, comme une app native.

L'installation compte : sur iOS, une page web simplement mise en favori peut voir son stockage effacé après sept jours d'inactivité, alors qu'une application ajoutée à l'écran d'accueil est conservée.

## Sauvegarde

Les données vivent dans le navigateur de l'appareil. Il n'y a pas de copie ailleurs : **Réglages → Exporter** produit un fichier JSON lisible, à conserver (iCloud, Drive, e-mail à soi-même). **Importer** le relit, y compris depuis une sauvegarde de l'ancienne version Cloudflare de l'app.

À faire une fois par mois, ou avant de changer de téléphone.

## Développement

Node ≥ 22.13.

```bash
npm ci
npm run dev
```

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement sur `http://localhost:5173` |
| `npm test` | tests unitaires du domaine (progression, séance, statistiques, persistance) |
| `npm run lint` | ESLint + règles React Hooks |
| `npm run build` | typecheck, génération des icônes, bundle statique dans `dist/` |
| `npm run check` | les trois précédents, dans l'ordre du CI |
| `npm run preview` | sert le bundle de production localement |

## Déploiement

Chaque push sur `main` déclenche `.github/workflows/deploy.yml` : lint, tests, build, publication sur GitHub Pages. Le build reçoit `BASE_PATH=/<nom-du-dépôt>/`, ce qui permet au même code de tourner en local à la racine et en ligne dans un sous-chemin.

## Stack

React 19 · TypeScript strict · Vite · CSS natif avec design tokens · IndexedDB · service worker maison.

Aucune dépendance d'exécution en dehors de React : pas de framework CSS, pas de bibliothèque de graphiques, pas de client HTTP. Le bundle fait ~84 ko gzip.

## Architecture

Voir [ARCHITECTURE.md](ARCHITECTURE.md) — les choix de structure, ce qu'ils empêchent comme bugs, et les pièges connus.

## Avertissement

Les propositions de charge sont un outil de suivi déterministe, pas une prescription médicale ni un coaching certifié. En cas de douleur inhabituelle, arrêter la série.
