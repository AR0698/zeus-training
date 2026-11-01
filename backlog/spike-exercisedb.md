# Spike T7 — ExerciseDB peut-il illustrer les exercices de Zeus ?

Date : 2026-10-27. Spike en lecture seule, aucun code de l'app touché.

## Recommandation : **non** pour embarquer, à ne rouvrir que si les conditions d'utilisation l'autorisent par écrit

Les médias d'ExerciseDB ne sont pas sous licence libre, les conditions d'utilisation n'ont pas pu être lues, et un concurrent affirme qu'elles interdisent de stocker les données. Or Zeus doit fonctionner hors ligne, donc copier les médias dans l'app. Tant que ce point n'est pas tranché par écrit, on garde les figures maison (CC-BY-SA, déjà livrées, 1,4 Mo pour 160 images).

Verdict en une ligne pour **T11 (catalogue Technogym)** : ça ne change pas la donne. ExerciseDB décrit des machines génériques (« leverage machine », « sled machine », « smith machine »), pas le catalogue Technogym. T11 reste bloqué sur la question des droits Technogym, et ExerciseDB ne la contourne pas.

## Ce qui a été vérifié, et ce qui ne l'a pas été

| Sujet | Statut |
|---|---|
| Licence du dépôt GitHub | Vérifié : AGPL-3.0 (API GitHub) |
| Contenu du dépôt | Vérifié : il ne contient que `LICENSE` et `README.md`. Pas de code, pas de données, pas de médias. |
| Licence des images, GIF et données | **Non trouvée.** Le README n'en donne aucune. |
| Conditions d'utilisation (`dub.sh/exercisedb-api-tos`) | **Illisibles** : 403 (WebFetch et curl). |
| Tarifs | Non vérifiés : le README renvoie vers une page « Pricing Plans ». |
| Couverture exercice par exercice | **Non mesurée** (voir plus bas). |

## 1. Licence

- **L'AGPL-3.0 du dépôt ne couvre pas les médias.** Le dépôt est vide de code, et rien n'indique que les GIF ou les données relèvent de cette licence.
- Le README renvoie les droits aux « Terms of use », que je n'ai pas pu ouvrir. Aucune mention d'attribution ni d'usage commercial n'apparaît dans le README.
- **Non confirmé** : la page marketing d'un concurrent (RepDB) affirme que les conditions d'ExerciseDB interdisent de mettre les données en cache ou de les stocker. C'est une source intéressée, mais si c'est vrai, cela exclut l'embarqué hors ligne.
- Pour une app privée entre amis : le risque réel est faible, mais « privée » ne vaut pas licence. La redistribution embarquée (fichiers dans le dépôt ou le build, publiés sur un hébergement) est la partie qu'il faut faire autoriser.

**Action pour lever le doute** : lire les conditions d'utilisation dans un navigateur et, si elles ne disent rien de net, écrire à `hello@exercisedb.dev` (adresse du README) en demandant si le stockage local des GIF dans une app privée est autorisé.

## 2. API, quotas, hébergement

- Deux niveaux :
  - **Version libre** `oss.exercisedb.dev/api/v1/exercises` : environ 1 500 exercices (`meta.total` = 1500, pagination par curseur), JSON avec `gifUrl`, muscles, équipements et instructions en anglais. Le README dit que ces points d'accès sont « pour exploration » et « pas recommandés en production » (limites strictes, instabilité).
  - **V2 / offre payante** (11 000+ exercices annoncés, 5 000+ GIF, 15 000+ vidéos MP4, 20 000+ images PNG), vendue via des plans (RapidAPI d'après la documentation Notion, non lue en détail) : tarifs non vérifiés.
- **Quota observé** : la version libre répond **429 Too Many Requests** après quelques requêtes en rafale. Elle ne convient pas à un chargement à la demande depuis l'app.
- Médias hébergés sur `static.exercisedb.dev/media/<id>.gif`, derrière Cloudflare. Aucune garantie de durée de vie.
- Les textes sont en anglais ; Zeus est en français.

## 3. Couverture du catalogue Zeus

Le catalogue compte **123 mouvements** (`src/domain/catalog/*.ts` : pectoraux 16, dos 18, épaules 15, bras 18, jambes 32, tronc 24).

**Je ne peux pas donner de taux mesuré, ni de tableau de correspondance vérifié.** La récupération de la liste complète a été bloquée par le 429, puis j'ai arrêté de moissonner (insister aurait contourné la limite de débit). L'échantillon obtenu ne contient que **25 exercices distincts**, répétés par une erreur de mon script : inutilisable pour un taux. Ce qu'il montre quand même :

- Des noms étranges ou hors sujet pour du renforcement (« impossible dips », « barbell seated bradford rocky press », « isometric wipers », « upward facing dog », des étirements).
- Des équipements génériques : `leverage machine`, `sled machine`, `smith machine`, `cable`, `assisted`. Aucun libellé de marque.
- Un GIF unique mesuré : 67 Ko (`image/gif`).

**Estimation (non vérifiée)** : les mouvements classiques au poids du corps, aux haltères et à la barre (pompes, dips, tractions, squats, soulevés, curls, développés, gainage) ont de bonnes chances d'exister dans la base complète payante. Les machines précises de salle (Pec Deck, Chest Press inclinée, Abducteurs machine, Hack squat, relevés de genoux à la chaise romaine) et les variantes propres à Zeus (« Leg Press — pieds hauts », « Tirage prise serrée », variantes élastique) sont plus incertaines. Je ne chiffre pas de pourcentage, faute de mesure.

Pour mesurer : récupérer la liste complète avec un accès légitime (plan ou autorisation du fournisseur), puis rapprocher les 123 identifiants par nom anglais.

## 4. Format, poids, hors ligne

- Format : **GIF animé**, ~67 Ko pour l'unique exemple mesuré. Pour 123 exercices : environ **8 Mo** (une seule mesure, ordre de grandeur seulement), contre **1,4 Mo** pour les figures actuelles.
- Faisabilité technique : triviale (télécharger, ranger dans `public/exercises/`, précacher dans le service worker). Le blocage est juridique, pas technique.
- Lecture en ligne seule (hotlink vers `static.exercisedb.dev`) : contraire au principe « statique et hors ligne » de Zeus, soumise au 429 et à la disparition possible de l'hébergement.
- Un GIF boucle sans contrôle : pas de respect de `prefers-reduced-motion`, contrairement à l'alternance de deux poses actuelle.

## 5. Comparaison avec les figures maison

| Critère | Figures maison (everkinetic, CC-BY-SA 4.0) | ExerciseDB |
|---|---|---|
| Droits | Clairs, attribution à conserver | Non établis, conditions illisibles |
| Hors ligne | Oui, déjà livré | Possible techniquement, droits incertains |
| Poids | 1,4 Mo (160 fichiers webp, 80 mouvements) | ~8 Mo estimés pour 123 GIF |
| Couverture | 80 mouvements illustrés sur 123 | Inconnue (non mesurée) |
| Accessibilité | Deux poses alternées, animation désactivable | GIF en boucle, pas de contrôle |
| Style | Dessins cohérents | Rendu hétérogène, noms parfois fantaisistes |
| Langue | Libellés en français | Instructions en anglais |

## Suite proposée

1. Si le gain visuel vaut l'effort : lire les conditions dans un navigateur, ou écrire à `hello@exercisedb.dev`.
2. Si l'autorisation écrite est obtenue : mesurer la couverture avec un accès légitime, puis n'adopter qu'en **partiel** (combler les ~43 mouvements sans figure), sans remplacer les figures maison.
3. Sinon : dessiner les figures manquantes, ou étendre la source everkinetic (même licence).
