# Zeus Training

Carnet de musculation Upper/Lower, pensé pour être utilisé **d'une main, entre deux séries**, dans une salle mal éclairée et sans réseau.

Application web statique, installable sur l'écran d'accueil, **sans compte, sans serveur, sans suivi**. Toutes les données d'entraînement restent sur l'appareil.

---

## Ce que fait l'application

Chaque installation part **vide** : au premier lancement, on choisit de composer ses propres séances, de partir de quatre séances d'exemple, ou d'importer une sauvegarde. Personne n'hérite du programme de quelqu'un d'autre, et rien n'est figé — tout le contenu se modifie depuis l'app, sans toucher au code.

- **Premier lancement** — le choix de départ, le prénom, et l'explication de ce que « local » implique vraiment : aucune copie ailleurs, aucune récupération possible sans sauvegarde.
- **Aujourd'hui** — la prochaine séance du cycle, calculée depuis l'historique, démarrable en un geste.
- **Mode séance** — validation série par série, correction rapide de la charge et des répétitions, minuteur de repos, remplacement d'un exercice quand la machine est prise, exercice passé, arrêt et reprise plus tard. Une séance partielle est enregistrée comme une séance normale.
- **Double progression prudente** — la cible ne monte que si toutes les séries ont atteint le haut de la fourchette sans être difficiles ; elle baisse de 10 % si une série est passée sous la fourchette ; elle est allégée de 10 % après trois semaines d'arrêt.
- **Catalogue de 123 mouvements** — recherche par nom, par muscle (« pecs », « ischios ») ou par matériel, filtre par matériel disponible, et **trois équivalents minimum par exercice** pour le jour où la machine est prise. Un mouvement absent du catalogue se crée sur mesure.
- **Programmes** — éditeur complet : créer, renommer, dupliquer et supprimer une séance, ajouter et réordonner des exercices, régler séries, fourchette de répétitions, charges, repos, consignes et équivalents.
- **Progrès** — volume par séance, records personnels, séries en cours, historique complet. Aucun chiffre n'est inventé : sans séance, l'écran le dit.
- **Rappel de sauvegarde** — une fois par mois à l'ouverture, l'app explique où vivent les données et propose l'export. « Plus tard » reporte d'une semaine, un export repart pour un mois.
- **Réglages** — thème, repos par défaut, vibrations, écran maintenu allumé, export / import, partage de l'application et envoi d'un retour.

## Installation sur le téléphone

1. Ouvrir l'application dans Safari (iOS) ou Chrome (Android).
2. **Partager → Sur l'écran d'accueil** (iOS) ou **⋮ → Installer l'application** (Android).
3. Ouvrir Zeus depuis l'icône : plein écran, hors ligne, comme une app native.

L'installation compte : sur iOS, une page web simplement mise en favori peut voir son stockage effacé après sept jours d'inactivité, alors qu'une application ajoutée à l'écran d'accueil est conservée.

## Sauvegarde

Les données vivent dans le navigateur de l'appareil. Il n'y a pas de copie ailleurs : **Réglages → Exporter** produit un fichier JSON lisible, à conserver (iCloud, Drive, e-mail à soi-même). **Importer** le relit, y compris depuis une sauvegarde de l'ancienne version Cloudflare de l'app.

À faire une fois par mois, ou avant de changer de téléphone. L'application le rappelle d'elle-même : trente jours après le dernier export, une explication complète s'affiche à l'ouverture, avec le bouton d'export. Elle n'apparaît jamais tant qu'il n'y a rien à perdre, et se reporte d'une semaine si on répond « plus tard ».

## Partager l'application

**Réglages → Partage** envoie l'adresse du site. Il n'y a rien d'autre à faire : la personne l'ouvre, l'ajoute à son écran d'accueil, et démarre avec ses propres séances. Aucune donnée n'est partagée entre deux installations — il n'y a pas de serveur pour les faire transiter.

**Réglages → Retour** ouvre un message pré-rempli dans l'application mail du téléphone (avis, bug, idée de fonctionnalité). Rien n'est envoyé sans un appui explicite sur Envoyer ; hors ligne, le brouillon attend dans la boîte d'envoi. L'adresse de destination se change dans [`src/config.ts`](src/config.ts).

## Développement

Node ≥ 22.13.

```bash
npm ci
npm run dev
```

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement sur `http://localhost:5173` |
| `npm test` | tests unitaires du domaine (progression, séance, statistiques, persistance, catalogue, accueil, rappel) |
| `npm run lint` | ESLint + règles React Hooks |
| `npm run build` | typecheck, génération des icônes, bundle statique dans `dist/` |
| `npm run check` | les trois précédents, dans l'ordre du CI |
| `npm run preview` | sert le bundle de production localement |

## Déploiement

Chaque push sur `main` déclenche `.github/workflows/deploy.yml` : lint, tests, build, publication sur GitHub Pages. Le build reçoit `BASE_PATH=/<nom-du-dépôt>/`, ce qui permet au même code de tourner en local à la racine et en ligne dans un sous-chemin.

## Stack

React 19 · TypeScript strict · Vite · CSS natif avec design tokens · IndexedDB · service worker maison.

Aucune dépendance d'exécution en dehors de React : pas de framework CSS, pas de bibliothèque de graphiques, pas de client HTTP. Le bundle fait ~103 ko gzip, dont une bonne part est le catalogue de mouvements — embarqué plutôt que téléchargé, puisque la salle de sport est justement l'endroit sans réseau.

## Architecture

Voir [ARCHITECTURE.md](ARCHITECTURE.md) — les choix de structure, ce qu'ils empêchent comme bugs, et les pièges connus.

## Avertissement

Les propositions de charge sont un outil de suivi déterministe, pas une prescription médicale ni un coaching certifié. En cas de douleur inhabituelle, arrêter la série.
