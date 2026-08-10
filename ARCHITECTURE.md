# Architecture

Ce document explique **pourquoi** le code est découpé ainsi. Chaque règle ci-dessous existe parce qu'elle supprime une classe de bugs entière, pas parce qu'elle est élégante.

---

## 1. Le principe directeur : une seule direction de dépendance

```
domain/      ← fonctions pures : règles de progression, calculs, formatage
   ↑
state/       ← un reducer, des actions nommées, validation et migration
   ↑
storage/     ← IndexedDB, export/import (le seul I/O)
   ↑
ui/          ← React : ne calcule rien, affiche et dispatche
```

Rien ne pointe vers le bas. `domain/` ignore l'existence de React, du navigateur, du stockage et même de l'horloge. C'est ce qui rend les règles d'entraînement testables sans navigateur, et c'est pourquoi 47 tests tournent en moins de 200 ms.

**Bug empêché :** une règle métier qui change de comportement selon l'écran où elle est appelée.

---

## 2. Une séance est un instantané, pas une référence

`Session` recopie tout ce dont elle a besoin depuis le programme (nom, fourchette de reps, consignes, charges de départ) au moment du démarrage. Elle ne garde **aucun index** vers `Program.exercises`.

L'ancienne version faisait `active.logs[exerciseIndex]` : si un programme était modifié ou réordonné pendant une séance, les séries validées se retrouvaient rattachées au mauvais mouvement, et la progression écrivait des charges sur le mauvais exercice. Le test `progression is written back by exercise id, not by position` inverse volontairement l'ordre des exercices avant d'écrire les résultats : il échoue si quelqu'un réintroduit un couplage par position.

**Bug empêché :** désynchronisation silencieuse entre ce qui est affiché et ce qui est enregistré.

---

## 3. Un seul reducer, des actions nommées

Tout changement d'état passe par `state/reducer.ts` et une action de l'union discriminée `Action`. Pas de `setState` disséminé dans les vues, pas de mutation depuis un gestionnaire d'événement.

Conséquences concrètes :

- n'importe quel bug se rejoue à partir d'un état + une liste d'actions ;
- le `default:` du `switch` assigne l'action à `never` : ajouter une action sans écrire son cas **casse le typecheck**, pas la production ;
- l'annulation (`Annuler` dans les notifications) est une pile d'états précédents, gratuite parce que l'état est immuable.

L'ancienne version appelait `void persist(next)` **à l'intérieur** d'un updater `setState`. Un updater doit être pur ; en StrictMode React l'exécute deux fois, ce qui déclenchait deux écritures réseau par frappe. Ici la persistance observe l'état depuis un `useEffect`, elle ne s'exécute jamais pendant un rendu.

**Bug empêché :** effets de bord dupliqués, ordre d'écriture non déterministe.

---

## 4. Rien ne fait confiance au disque

`state/schema.ts` expose `parseAppState(raw, now)` avec un contrat absolu : **elle ne lève jamais d'exception et renvoie toujours un état utilisable.** Chaque champ est relu, borné, et remplacé par une valeur par défaut s'il est illisible ; les problèmes rencontrés remontent dans `issues` et s'affichent en bandeau.

Le test `parsing survives complete garbage` lui donne `null`, `42`, `"nope"`, `[]`. Le test `parsing repairs a partially corrupted state` lui donne un thème inexistant, un poids qui vaut `"lourd"` et une date qui vaut `"pas une date"`.

Le champ `version` et la fonction `migrateLegacy` assurent la compatibilité ascendante : une sauvegarde exportée de la version Cloudflare/D1 se réimporte telle quelle.

**Bug empêché :** l'écran blanc au démarrage parce qu'un champ a changé de forme entre deux versions.

---

## 5. Persistance : locale, différée, jamais silencieuse

- **IndexedDB** en primaire, `localStorage` en repli automatique (navigation privée), mémoire en dernier recours.
- Écriture **débattue à 400 ms**, plus un vidage forcé sur `pagehide` et `visibilitychange` : fermer l'app au milieu d'une série ne coûte jamais une série.
- **Instantanés** toutes les 30 minutes, huit conservés en rotation.
- `navigator.storage.persist()` demandé au démarrage, pour sortir de la file d'éviction de Safari.
- Un échec d'écriture **ne se tait pas** : `storageError` remonte et l'interface arrête de prétendre que tout est sauvegardé.

**Bug empêché :** la perte de données perçue comme « l'app a oublié ma séance », sans aucun signal.

### Pourquoi pas de base de données

L'application a un seul utilisateur, un seul appareil à la fois, et son moment d'usage est précisément celui où le réseau est mauvais — un sous-sol de salle de sport. Une base distante ajouterait un serveur à maintenir, une latence à chaque série validée, un mode hors ligne à écrire malgré tout, et des données personnelles hébergées ailleurs. Le local-first supprime les quatre.

Le coût assumé : **une seule copie**. D'où l'export JSON traité comme une fonctionnalité de premier plan, et non comme une option cachée.

Si une synchronisation multi-appareils devient nécessaire, l'état est déjà un document JSON unique et versionné : il suffit d'ajouter un adaptateur à côté de `storage/db.ts`. Rien dans `domain/` ni dans `ui/` n'a à changer.

---

## 6. Le temps ne se lit jamais pendant un rendu

`Date.now()` dans un rendu rend le composant impur. Le minuteur passe par `useNow()`, un `useSyncExternalStore` : React contrôle quand la valeur change, l'intervalle ne tourne que pendant une séance, et le retour d'arrière-plan resynchronise immédiatement.

Le minuteur de repos stocke un **instant de fin absolu**, pas un compteur décrémenté. Verrouiller l'écran, changer d'onglet ou subir le throttling des timers en arrière-plan ne le fait pas dériver.

**Bug empêché :** un chrono qui retarde de trois minutes après un passage en arrière-plan.

---

## 7. L'interface ne calcule pas

Les écrans lisent des fonctions de `domain/stats.ts` et `domain/format.ts`. Aucune valeur affichée n'est écrite en dur.

C'est une correction directe de la version précédente, qui affichait « 3 séances cette semaine » et « +25 % de volume depuis la reprise » en constantes littérales, quel que soit l'historique réel. Une app de suivi qui ment sur les chiffres n'a aucune raison d'exister ; sans historique, l'écran Progrès l'annonce et n'affiche pas de graphique vide.

---

## 8. Filet de sécurité et accessibilité

- **`ErrorBoundary`** : un crash d'affichage propose de recharger et de **télécharger les données brutes**. Une session n'est jamais prisonnière d'un build cassé.
- **Séance oubliée** : une séance ouverte depuis plus de cinq heures déclenche un choix explicite — reprendre, enregistrer telle quelle, abandonner — au lieu d'afficher un chrono à 14 h.
- **Feuilles modales** : élément natif `<dialog>`, donc piège de focus, `Échap`, et arrière-plan inerte gérés par la plateforme plutôt que réimplémentés de travers.
- **Cibles tactiles** ≥ 44 px partout ; sous 640 px chaque série passe sur deux lignes pour que le bouton de validation reste large et atteignable au pouce.
- **Contraste** : chaque paire texte/fond des deux thèmes est au-dessus de 4,5:1 ; les jetons sont commentés avec leur ratio dans `styles/tokens.css`.
- **`prefers-reduced-motion`** désactive les animations ; aucune information n'est portée par la couleur seule.

---

## Pièges connus

| Sujet | État |
| --- | --- |
| Multi-appareils | non supporté par construction : une seule copie locale, export manuel |
| Deux onglets ouverts en parallèle | le dernier qui écrit gagne ; pas de fusion |
| Polices Google | mises en cache par le service worker après la première visite ; sans réseau au tout premier chargement, l'app tombe sur les polices système |
| Programmes | entièrement éditables ; la seule limite est qu'un exercice ne peut pas être déplacé d'une séance à une autre (le dupliquer puis le retirer revient au même) |
| RPE / RIR, supersets, échauffements | non modélisés ; les supersets bras existent comme deux exercices consécutifs |
| Historique | plafonné à 400 séances (~2 ans à 4 séances/semaine) |

## 9. L'éditeur ne peut pas produire un état invalide

Un éditeur ouvert à tous est le moyen le plus direct de fabriquer des données incohérentes : trois séries mais quatre charges, un maximum de répétitions sous le minimum, un nom vide, un programme sans exercice.

La réponse n'est pas de valider dans les formulaires — il y en a trop, et chacun oublierait un cas. Toute modification d'exercice passe par `patchExercise()` dans `domain/library.ts`, qui **répare** systématiquement : les tableaux de charges sont redimensionnés sur le nombre de séries, `repMax` remonte à `repMin`, un nom vide retombe sur l'ancien, le repos est borné, les équivalents vides sont retirés. L'interface, elle, n'a aucune règle à connaître.

Deux conséquences voulues :

- **Ajouter deux fois le même mouvement est légitime** (pré-fatigue, série de récupération). `uniqueExerciseId()` suffixe l'identifiant pour que les deux gardent des séries distinctes.
- **Une séance vide est un état normal**, pas une corruption : c'est une séance en cours d'écriture. Elle ne peut simplement pas être démarrée, et `parseAppState` ne la remplace pas par les valeurs par défaut au rechargement — sinon supprimer un exercice se déferait tout seul.

`nextProgram()` renvoie `null` quand il ne reste aucune séance, au lieu de lever une exception : une bibliothèque vide est un écran à dessiner, pas un plantage.

## Ajouter une fonctionnalité sans casser le reste

1. Si c'est une **règle** (progression, statistique, calcul) : l'écrire dans `domain/`, en fonction pure, avec un test. Ne pas la faire passer par React.
2. Si c'est un **changement d'état** : ajouter une action dans `state/actions.ts` puis son cas dans le reducer. Le typecheck indiquera ce qui manque.
3. Si ça **modifie la forme de `AppState`** : incrémenter `CURRENT_VERSION`, étendre `parseAppState` pour lire l'ancienne forme, ajouter un test de migration. Ne jamais supposer que le disque contient la forme actuelle.
4. Si c'est **visuel** : utiliser les jetons de `styles/tokens.css`. Aucune valeur hexadécimale ni taille en dur dans un composant.
