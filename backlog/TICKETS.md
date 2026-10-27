# Backlog Maintenance — tickets préparés (27 oct. 2026)

Source : 16 cartes du tableau « Backlog Maintenance » (captures d'écran du tableau).
Statut : **🚀 lancé** (session dédiée, worktree propre) · **❓ à clarifier** · **✅ probablement déjà fait**.

---

## 🚀 Lancés

T1 à T6 sont livrés et fusionnés ; T7 a rendu son rapport (`backlog/spike-exercisedb.md`).

### T1 — Bug gainage : un exercice chronométré affiche la durée dans « Tours »
- **Constat** (capture *Bug gainage*) : Gainage planche, chaque série montre `Durée 45 s` **et** `Tours 45`. La cible `45–60 s` est recopiée dans les deux colonnes ; le bouton de validation à droite paraît vide.
- **Code** : `src/ui/screens/SessionScreen.tsx` (≈ l. 310–360), initialisation des séries dans `src/domain/session.ts`.
- **Fait quand** : pour `unit === "sec"`, la série n'affiche jamais la cible en secondes dans les tours (durée seule, ou tours initialisés à 1) ; la coche de validation est visible ; test ajouté.

### T2 — Récupérer une séance arrêtée sans faire exprès
- **Constat** : « Abandonner sans enregistrer » (`session/abandon` → `session: null`) est définitif.
- **Fait quand** : après un abandon, la séance reste récupérable (toast « Annuler » + reprise depuis l'accueil tant qu'aucune nouvelle séance n'est démarrée) ; tests reducer.

### T3 — Séance d'une durée personnalisée (ex. 2 h)
- **Constat** (retour d'un utilisateur) : impossible de régler une séance de 2 h. Le champ `Durée estimée` est un `<input type="number">` (5–240) dans `ProgramEditorScreen.tsx`, peu maniable sur mobile.
- **Fait quand** : on règle facilement 120 min à 375 px (stepper ±5 min et/ou choix rapides), affichage « 2 h » / « 1 h 30 » dans Programmes et Aujourd'hui ; plafond 240 conservé.

### T4 — Section commentaire à chaque exercice
- **Fait quand** : pendant la séance, chaque exercice a une note facultative ; elle est enregistrée dans l'historique et rappelée à la séance suivante sur le même exercice ; schéma de stockage à jour.

### T5 — Machine occupée : nom personnalisé + machine par défaut pour la prochaine séance
- Regroupe *Pouvoir rajouter une machine avec un nom personnalisé* et *Possibilité de définir une machine par défaut pour la prochaine séance*.
- **Code** : `src/ui/components/ReplaceSheet.tsx`, reducer.
- **Fait quand** : dans « Remplacer », on peut saisir un nom libre ; après un remplacement, « Garder pour les prochaines séances » met à jour le programme.

### T6 — Sons
- **Fait quand** : un signal sonore (Web Audio, sans fichier externe) marque la fin du repos et la fin d'une série chronométrée ; réglage on/off dans Réglages.

### T7 — Spike : tester les images ExerciseDB
- Lien de la carte : GitHub `ExerciseDB/exercisedb-api`.
- **Fait quand** : rapport (licence, couverture du catalogue Zeus, poids, usage hors ligne) — pas de code de prod. Sert à trancher T11.

---

## ❓ À clarifier avant de lancer

| # | Carte | Question |
|---|---|---|
| T8 | Plus les animations des sportifs | Les figures alternent déjà deux poses (commit `e695870`). Plus de poses, animation fluide, ou figures pour plus d'exercices ? |
| T9 | Pas de temps de repos entre les séances | Repos entre **séries** (un minuteur existe) ou jours de récupération entre **séances** ? |
| T10 | Fonction tabata pour les exos | 20 s / 10 s × 8 fixe ou paramétrable ? Un exercice ou un bloc de plusieurs ? |
| T11 | Rentrer le catalogue Technogym d'images et mouvements | Visuels Technogym protégés : licence obtenue ? Sinon s'appuyer sur T7 ou nos figures. |
| T12 | Possibilité de prendre en photo les machines | Photo par exercice stockée localement ? Incluse dans la sauvegarde ? |
| T13 | Il manque l'échauffement au début d'un exercice | Séries d'échauffement par exercice, ou étape d'échauffement de séance (champ `warmup` existant mais non joué) ? |

## ✅ Probablement déjà fait

| # | Carte | Note |
|---|---|---|
| T14 | Faire un audit des liens wikigym | Commit `da97fcd` : 41 liens MuscleWiki audités, 17 morts corrigés. À fermer, ou refaire une passe ? |
