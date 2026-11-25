# EconQuest Sovereign Council Terminal

[English](./README.md) · [Español](./README.es.md) · **Français** · [Português](./README.pt.md)

EconQuest est un terminal de recherche gratuit et open source pour comprendre l'économie des pays, les
finances de leurs États et les risques qui les entourent. Il rassemble des chiffres de sources publiques
gratuites (le FMI, la Banque mondiale, la Banque des règlements internationaux, les banques centrales,
les instituts statistiques et d'autres), affiche chacun avec sa provenance et sa date, et vous permet de
poser des questions à un conseil d'agents d'IA spécialisés qui ne répondent qu'à partir de ces chiffres.

Il tourne sur votre propre ordinateur. Il n'y a pas de site EconQuest où s'inscrire ni de compte chez
nous : vos clés, vos recherches enregistrées et vos questions restent chez vous. Toute l'application
est en **anglais, espagnol, français et portugais du Brésil**.

![Page Recherche pour le Brésil : une note claire sur l'économie, avec la source de chaque chiffre, et « Manquant » là où aucune source n'a répondu](docs/images/04-research-summary.png)

*Recherche > Un pays, onglet Résumé (capture en anglais). Chaque chiffre indique sa source et sa date ;
un chiffre qu'aucune source n'a fourni s'affiche « Manquant », avec la raison.*

Ce logiciel sert à la recherche et à l'enseignement ; ce n'est pas un conseil en investissement.

Ceci est une traduction du [README anglais](./README.md), qui fait foi. La partie pour les développeurs
n'existe qu'en anglais.

## Sommaire

- [Pourquoi ce projet](#pourquoi-ce-projet)
- [Gratuit, ouvert et indépendant](#gratuit-ouvert-et-indépendant)
- [La règle : uniquement des chiffres réels](#la-règle--uniquement-des-chiffres-réels)
- [Ce que vous pouvez en faire](#ce-que-vous-pouvez-en-faire)
- [Guide avec captures d'écran](#guide-avec-captures-décran)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration requise et tailles](#configuration-requise-et-tailles)
- [Modèles d'IA : lequel choisir, tailles et réglages](#modèles-dia--lequel-choisir-tailles-et-réglages)
- [Langues](#langues)
- [Quêtes : des solutions économiques à plusieurs](#quêtes--des-solutions-économiques-à-plusieurs)
- [D'où viennent les données](#doù-viennent-les-données)
- [Comment le vérifier](#comment-le-vérifier)
- [Feuille de route](#feuille-de-route)
- [Documentation](#documentation)
- [Licence](#licence)

---

## Pourquoi ce projet

Selon les mots du responsable du projet :

> "In 2026 we feel and see the economic effects of poor economic policies. I wanted to see if I could
> make a tool that could assist people in learning and understanding economics, finding multiple and
> optimal financial and policy options, and attempting to bring the best tools to the most
> underserved countries."
>
> (En 2026, nous ressentons et voyons les effets économiques de mauvaises politiques économiques. Je
> voulais voir si je pouvais créer un outil qui aide les gens à apprendre et à comprendre l'économie, à
> trouver des options financières et politiques multiples et optimales, et à apporter les meilleurs
> outils aux pays les moins bien servis.)

Les terminaux économiques professionnels coûtent des dizaines de milliers de dollars par an, ce qui les
met hors de portée de la plupart des étudiants, des journalistes, des petits ministères des finances et
banques centrales, et des analystes des pays qui ont le plus besoin d'une politique économique réfléchie.
EconQuest veut offrir une grande partie de ces mêmes analyses, à partir de données officielles gratuites,
avec chaque méthode écrite pour que chacun puisse la vérifier.

**Pour qui :** analystes de la dette et du crédit souverains des pays émergents, économistes des banques
centrales, des ministères des finances et des institutions internationales, investisseurs macro et
change, équipes de risque pays, enseignants et étudiants, journalistes, et toute personne qui veut
comprendre ce qui arrive à une économie et pourquoi.

## Gratuit, ouvert et indépendant

- **L'application est gratuite**, sur tous les ordinateurs, et le restera. Pas d'offre payante ni de
  publicité.
- **Aucun suivi.** L'application n'envoie rien sur vous au projet : ni comptage d'usage, ni rapport
  de plantage, ni outil d'analyse. Ce qui quitte votre ordinateur, et quand, est listé dans
  [docs/PRIVACY.md](./docs/PRIVACY.md) (en anglais).
- **Open source.** Le code est sous licence Apache 2.0 ; la documentation, les notes de méthode et le
  contenu pédagogique sous CC BY 4.0 : chacun peut les utiliser, les modifier et les partager.
- **Dons, uniquement via le site du projet**, par GitHub Sponsors et Open Source Collective, une fois que
  le projet aura un hôte fiscal. D'ici là, aucun don n'est accepté ([GOVERNANCE.md](./GOVERNANCE.md)).
  Les donateurs n'ont aucun mot à dire sur les méthodes, les résultats ou les pays couverts.
- **Dépôt public :** [github.com/e-conquest/econquest](https://github.com/e-conquest/econquest), avec
  l'application prête à l'emploi sur `ghcr.io/e-conquest/econquest`.

---

## La règle : uniquement des chiffres réels

Un chiffre n'apparaît que s'il vient d'une source en direct, d'une série officielle ou de votre propre
fichier. Tout le reste s'affiche **Manquant**, avec la raison (« À configurer », « La source n'a pas
répondu », « Pas encore de source »). Il n'y a aucun chiffre intégré, d'exemple ou estimé par une IA dans
l'application. Si l'application ne connaît pas un chiffre, elle le dit au lieu de le deviner.

Les données payantes (par exemple les prix de CDS, LSEG, EPFR, les notations ou le consensus des
analystes) ne sont utilisées qu'à partir de votre propre compte ou fichier, derrière un interrupteur dans
les Réglages, et ne sont jamais transmises dans les téléchargements ou les copies partagées.

---

## Ce que vous pouvez en faire

| Tâche | Où | Ce que vous obtenez |
| --- | --- | --- |
| Poser une question en langage courant | **Espace de travail** (Chat du conseil) | Des agents spécialisés répondent à partir des chiffres de l'application, chacun avec sa source ; sans modèle d'IA, une réponse courte selon les règles déclarées de l'application vient d'abord ; avec un modèle d'IA, un agent de synthèse rédige une courte note qui ne peut citer que leurs chiffres, et un contrôle signale tout chiffre impossible à retracer |
| Demander ce que ferait un changement | **Espace de travail** (Chat du conseil) | Demandez « que se passerait-il pour la Turquie si la Fed relevait ses taux d'un point ? ». L'application vous montre le changement qu'elle a compris (vous pouvez modifier les ampleurs et reposer la question), le Scenario Agent met les chiffres d'aujourd'hui à côté des chiffres après le changement, liste ce qui s'est passé lors d'épisodes passés du même type et ce qu'ont trouvé des études publiées, et la réponse arrive en huit parties, chacune marquée du type d'éléments sur lequel elle repose |
| Étudier un pays | **Recherche > Un pays** | Résumé, Marchés et signaux, Historique et données, Sources. Historique et données montre le graphique de l'historique, puis un menu d'outils en huit groupes qui s'ouvrent un par un : graphiques sur des années, estimations du présent et prévisions avec intervalles, écart de production, soutenabilité de la dette, adéquation des réserves, règles de politique monétaire, alerte précoce de crise, courbe des taux, moteurs de l'inflation, comptabilité de la croissance, prévisions du FMI par édition, et vues « à une date passée ». Pour les pays à revenu plus faible : envois de fonds, aide reçue, inclusion financière, prix des matières premières et termes de l’échange, prix alimentaires et sécurité alimentaire, et catastrophes naturelles. Météo dans la capitale depuis 1981 et sur tout le pays depuis 1901, prix du riz, du blé, du maïs et du soja depuis 1960, un outil de conception d'assurance paramétrique (coût de sinistralité, prix équitable, périodes de retour, risque de base), un modèle de pertes dues aux catastrophes et les trajectoires des cyclones tropicaux. Comment la monnaie est gérée dans les faits, actifs de la banque centrale et tension sur le financement en dollars. Pour les administrations et les élus : crédibilité du budget (quelle part du budget voté a été dépensée, avec les bandes de note PEFA), un suivi de l'exécution du budget à partir de votre propre fichier, les projets de la Banque mondiale et leur rythme de décaissement, et des chiffres régionaux. Pour les économistes et les opérateurs de marché : fourchettes tirées des erreurs passées des prévisions, courbes de taux complètes des États-Unis et de la zone euro, et surprises dans les données avec un indice de surprises d'inflation |
| Comparer des pays | **Recherche > Comparer des pays** | Votre liste de suivi côte à côte (les 19 pays membres du G20 au départ, ou les 15 plus grands pays à faible revenu par région), des pistes d'articles et les écarts entre prix de marché et données |
| Suivre vos positions | **Recherche > Mes positions** | Une liste d'obligations ou de positions que vous chargez, face aux risques et aux signaux |
| Évaluer un choix de politique | **Revue de politique** (sa propre page dans l'en-tête) | Un dossier pas à pas : poser le problème, diagnostiquer, classer les options, examiner les preuves et les précédents, rédiger une note de recommandation et une synthèse d'une page pour les non-économistes, puis suivre ce qui s'est passé. Comparez le diagnostic avec jusqu'à six pays pairs, recevez une alerte sur la page d'accueil quand un chiffre suivi franchit son seuil, et voyez ce qui a changé quand vous reprenez la même politique. Le conseil des politiques pèse une mesure (coûts et avantages aux taux d'actualisation officiels, qui gagne et qui perd, ce qui suit, scénarios) ou ce qu'un événement signifie pour un marché. **Pour les gens** transforme une revue en un résumé simple pour les citoyens : ce qui change, le coût par personne, qui gagne et qui paie, et les régions les plus en retard |
| Tester une hypothèse budgétaire | **Historique et données**, ou depuis le Chat du conseil | Modifiez les dépenses publiques ou les impôts et voyez l'effet probable sur la croissance et la dette, avec des multiplicateurs et élasticités publiés et un intervalle |
| Rédiger un rapport | **Rapports** (onglets : Rédiger une note, Documents du conseil, Carnets, Enseignement) | Notes pays et émetteur, évaluations de soutenabilité, revues de portefeuille et synthèses du conseil, en Markdown ou PDF avec sources et dates |
| Rédiger un document de travail | Graphiques du **Chat du conseil**, **Rapports > Carnets** | Épinglez un graphique dans un carnet de recherche avec la date jusqu'à laquelle vont ses chiffres et une empreinte des chiffres ; téléchargez le carnet en un seul zip (brouillon, données, scripts Python, R et Stata, fichier de citation) ; plus tard, *Vérifier que cela tient* dit si chaque chiffre est identique, révisé ou disparu |
| Apprendre en chemin | Boutons de l'en-tête, **Menu > Manuel d'utilisation**, **Menu > Exemples guidés** | Quatre niveaux d'aide (Aide désactivée, Aide essentielle, Aide complète, Expert), un glossaire en langage clair, cinq cas guidés, des séquences pédagogiques et un mode examen |
| Utiliser vos propres données et tests | **Menu > Vos données**, **Menu > Modèles et validation** | Chargez vos propres séries CSV ; enregistrez votre propre test de signal ou de modèle selon les mêmes règles strictes que ceux de l'application |
| Utiliser les chiffres dans R, Python ou Stata | [docs/DATA_API.md](./docs/DATA_API.md) (en anglais) | Les mêmes séries, panels et tableaux qu'à l'écran, avec source et date pour chaque valeur |
| Connecter un système de portefeuille | **Menu > Réglages > Jetons d’API**, [docs/DATA_API.md](./docs/DATA_API.md) (en anglais) | Un autre programme lit des instantanés de pays et des événements, envoie ses positions et lance des chocs et des rejeux de crises passées sur son portefeuille, chacun avec un jeton limité à ce que vous cochez. Les pays et titres de la liste **Noms masqués** n’apparaissent nulle part |

Le **Chat du conseil** est le cœur de l'application. Les agents sont Banque centrale, Budget et dette,
Politique et événements, Valeur relative, Change, Contagion mondiale, Calendrier, Timing et Finance
comportementale, plus un agent Documents qui lit les textes de politique que vous chargez, un agent graphique pour les
graphiques et les tests, et le **Scenario Agent** pour les questions « et si... ? ». Si vous faites
tourner votre propre serveur d'outils de recherche, le **desk quantitatif** peut apporter dans une
réponse du chat ses backtests et ses chiffres de volatilité et d'options, chacun avec son lien et
l'étiquette « hypothétique » du serveur ; il reste éteint si vous ne le configurez pas. **Lancer le
conseil complet** envoie un pays à neuf agents spécialisés sur trois bureaux (géopolitique, crédit
souverain et économie générale) ; ils débattent, et l'application attend votre accord avant de rédiger
le rapport final. Un modèle d'IA plus grand sert d'**arbitre** et juge si chaque réponse s'en tient aux
chiffres.

Pour l'instant, les agents comprennent mieux les questions posées en anglais ; l'application le signale
près de la zone de saisie.

**Chaque chiffre, graphique et test fonctionne sans aucun modèle d'IA.** L'IA ne sert qu'à la synthèse du
chat, aux débats et aux explications en langage clair, et chaque réponse qu'elle rédige est signalée
comme écrite par une IA.

---

## Guide avec captures d'écran

Le guide complet, avec des étapes numérotées pour chaque tâche, se trouve dans
**[docs/GUIDE.fr.md](./docs/GUIDE.fr.md)**. Il couvre : le premier démarrage, interroger le conseil
(y compris ce que ferait un changement), étudier un pays et ses outils, comparer des pays, mener une revue de politique et rédiger un rapport, choisir un modèle
d'IA, les outils et la vérification des données, la langue et les niveaux d'aide, les outils météo et assurance,
l'usage sur téléphone et l'essai des Quêtes.

| | |
| --- | --- |
| ![Réponse du Chat du conseil avec une réponse courte selon les règles déclarées de l'application et ce que les agents ont trouvé](docs/images/02-council-answer.png) **Interrogez le conseil.** La réponse vient d'abord, chaque ligne avec ses chiffres ; le panneau des agents montre qui a répondu et pourquoi. | ![Historique et données : taux directeur du Brésil avec sa source et les boutons de téléchargement](docs/images/06-history.png) **Lisez l'historique.** Chaque graphique dit ce qu'il mesure, à qui est le chiffre et comment le lire. |
| ![Comparer des pays : pistes pour la liste du G20](docs/images/10-compare.png) **Comparez des pays.** Pistes et écarts entre marchés et données. | ![Page Revue de politique avec le formulaire de nouvelle revue](docs/images/12-policy-review.png) **Examinez une politique.** Du problème à la note. |
| ![Réglages > Modèle d'IA avec Ollama](docs/images/13-settings-ai.png) **Choisissez un modèle d'IA.** Modèle rapide pour les bureaux, grand modèle pour l'arbitre. | ![Page Recherche en français](docs/images/17-research-fr.png) **Changez de langue.** Bouton EN / ES / FR / PT dans l'en-tête. |

Les captures ont été prises le 24 novembre 2026 (deux du guide, Quêtes et Pairs, datent du 13 novembre)
sur une version locale de la branche principale, qui
rejouait des réponses enregistrées le 5 novembre 2026, uniquement des sources dont les conditions
permettent de transmettre les données. C'est pourquoi beaucoup de chiffres s'affichent « Manquant » ; sur
un ordinateur qui atteint les sources, davantage se remplissent. La plupart sont en anglais ; la dernière
montre l'application en français.

---

## Démarrage rapide

> **Pas encore public.** La copie publique sur github.com/e-conquest/econquest et l'application prête
> à l'emploi sur `ghcr.io/e-conquest/econquest` ne sont pas encore publiées : les liens de
> téléchargement et l'adresse `git clone` ci-dessous ne fonctionnent pas avant cela. Cette note sera
> retirée le jour de leur publication.

**Vous débutez ?** [docs/INSTALL.md](docs/INSTALL.md) (en anglais) est un guide pas à pas : installez
Docker Desktop, téléchargez un fichier et lancez l'application prête à l'emploi. Rien à compiler ni à
programmer.

**Application prête à l'emploi** (Docker Desktop lancé) :

```sh
mkdir econquest && cd econquest
curl -fsSLO https://raw.githubusercontent.com/e-conquest/econquest/main/deploy/quick-start/compose.yml
docker compose up -d          # puis ouvrez http://localhost:3737
```

**Ordinateur portable modeste** (4 Go de mémoire ou peu de disque) : mettez `LIGHT_MODE=on` dans un
fichier `.env` à côté de `compose.yml` avant de démarrer. Le mode léger ne fait tourner aucun modèle
d'IA sur votre ordinateur (le conseil utilise votre propre clé Gemini, ou reste éteint), laisse de côté
les 3,4 Go de fichiers d'actualité GDELT et ne télécharge que les pays de votre liste. Depuis le code :
`scripts/start-mac.sh --light`, ou `scripts\start-windows-light.bat` sous Windows.

**Depuis le code** (Node.js 20.19 ou plus récent, ou 22.12 ou plus récent) :

```sh
git clone https://github.com/e-conquest/econquest.git
cd econquest
npm install
npm run go           # met à jour, installe, démarre l'application et lance le téléchargement quotidien
```

`npm run go` récupère le code le plus récent, installe les paquets, télécharge les modèles d'IA si vous
utilisez Ollama, reconstruit et démarre l'application Docker sur http://localhost:3737 et celle de
développement sur http://localhost:3000, et lance le téléchargement quotidien des données en arrière-plan.
Sur Mac, vous pouvez double-cliquer sur `econquest-mac.command` (Windows : `scripts/start-windows.bat`).

### Premier démarrage

Sous l'accueil du chat, une courte carte, **Nouveau ici ? Trois étapes**, indique par où commencer
(poser une question, ouvrir Recherche et, si vous le souhaitez, ajouter un modèle d'IA) jusqu'à ce que
vous appuyiez sur **Compris**. Ensuite :

1. **Voyez quelles sources répondent :** Menu > Outils > Connexions de données (ou `npm run check:data`).
2. **Ajoutez une clé FRED gratuite** dans Menu > Réglages > Clés de données gratuites. Elle fournit les
   rendements officiels à 10 ans de plusieurs pays.
3. **Choisissez un modèle d'IA** dans Menu > Réglages > Modèle d'IA (ci-dessous).
4. **Choisissez vos pays** avec Modifier sur la carte de la liste de suivi.
5. **Choisissez la langue et le niveau d'aide** avec les boutons de l'en-tête.

Les clés sont enregistrées dans `data/local/settings.json` (jamais dans git, ni dans les sauvegardes, ni
dans le journal d'audit).

---

## Configuration requise et tailles

| Élément | Minimum | Recommandé |
| --- | --- | --- |
| Système | macOS (les trois versions les plus récentes), Windows 10 ou 11 (64 bits, WSL 2 pour Docker Desktop) ou Linux 64 bits | Idem ; Apple Silicon, Intel et AMD fonctionnent |
| Mémoire | 8 Go (4 Go en mode léger, un objectif pas encore mesuré) | 16 Go ; 32 Go pour faire tourner le grand arbitre sur le même ordinateur |
| Disque libre | 5 Go | 10 Go, plus la place des modèles d'IA |
| Internet | N'importe quelle connexion | Une connexion sans petit plafond mensuel |
| Node.js (seulement depuis le code) | 20.19 ou plus, ou 22.12 ou plus | 22 |

### Tailles de téléchargement

Chaque chiffre dit comment il a été obtenu. « Mesuré » signifie mesuré à la date indiquée ; « estimation »
donne la méthode. Les mesures du 13 novembre 2026 portent sur la branche principale jusqu'à la demande
#510 ; l'application compilée et les fichiers de langue ont été mesurés à nouveau le 17 novembre 2026,
jusqu'à la demande #598.

| Quoi | Taille | Comment le chiffre a été obtenu |
| --- | --- | --- |
| Code source (`git clone`) | 70 Mo (29 Mo de fichiers et 41 Mo d'historique) | Mesuré, clone neuf, 13 novembre 2026 |
| Application prête à l'emploi (image Docker) | Environ 170 Mo à télécharger ; 798 Mo une fois décompressée | Mesuré : image construite avec le Dockerfile du dépôt le 13 novembre 2026 (798 Mo décompressée, 170 Mo compressée avec gzip). Le téléchargement depuis le registre est compressé de la même façon, la taille sera donc proche |
| Paquets installés, depuis le code (`npm install`) | 465 Mo | Mesuré, 13 novembre 2026 |
| Application web compilée | 7,75 Mo au total ; 481 Ko compressés au démarrage | Mesuré avec `npm run size:check`, 24 novembre 2026, jusqu'à la pull request #677 (limites 520 Ko et 9 Mo) |
| Chaque langue supplémentaire | Environ 0,85 Mo (environ 270 Ko compressés), seulement si elle est choisie | Mesuré sur la version compilée, 17 novembre 2026 |
| Premier téléchargement complet des données | Environ 3,6 à 3,8 Go, surtout des fichiers d'actualité GDELT | Estimation : GDELT environ 3,4 Go pour 8 semaines (d'après les tailles publiées par GDELT), anciennes éditions du FMI environ 100 Mo (mesuré), le reste comme le téléchargement quotidien |
| Premier téléchargement en mode léger | Objectif : bien moins de 1 Go | Pas encore mesuré ; attendu d'un essai sur le Mac du développeur avant la publication |
| Téléchargement quotidien | Environ 150 à 200 Mo (4,5 à 6 Go par mois) | Estimation à partir de réponses enregistrées et de tailles de fichiers. Le téléchargement quotidien enregistre désormais ce qu'il récupère ; le chiffre mesuré après une semaine (`npm run go -- status` sur le Mac du développeur) remplacera cette estimation |
| Modèles d'IA via Ollama (facultatif) | qwen2.5:7b 4,7 Go ; qwen2.5:14b 9 Go ; qwen2.5:32b 20 Go | Tailles publiées par Ollama |
| Historique long GDELT (facultatif) | Environ 25 Go depuis 2016 (35 Go depuis 1979) ; environ 5 Mo conservés sur disque | Tailles publiées par GDELT |

### Espace occupé en fonctionnement

| Configuration | Disque environ | Composition |
| --- | --- | --- |
| Mode léger, sans IA locale | Objectif 2 Go | Pas encore mesuré |
| Application prête à l'emploi, sans IA locale | Environ 1 Go, plus environ 40 Mo par an | Image 0,8 Go (mesuré) plus le dossier `data/`, environ 150 Mo après les premiers jours (mesuré sur le Mac du développeur le 9 novembre 2026, 22 pays) |
| Avec un arbitre 14B | Environ 15 Go | Ce qui précède plus qwen2.5:7b et qwen2.5:14b |
| Avec toute l'IA en local | Environ 26 Go | Ce qui précède plus qwen2.5:7b et qwen2.5:32b |
| Depuis le code au lieu de l'image | Ajoutez environ 0,5 Go | Code et historique 70 Mo, paquets 465 Mo, version compilée 7,75 Mo (mesuré) |

Docker Desktop demande en plus quelques Go (voir docker.com). Pour connaître la taille réelle sur votre
ordinateur, lancez `du -sh data data/*` dans le dossier EconQuest ou ouvrez Menu > Données hors ligne.

---

## Modèles d'IA : lequel choisir, tailles et réglages

L'IA rédige la synthèse du conseil, anime le débat, choisit les agents pour une question et explique les
chiffres. Elle ne fournit jamais un chiffre : chaque nombre vient d'une source, d'une série officielle ou
de votre fichier. Choisissez le fournisseur dans Menu > Réglages > Modèle d'IA.

| Fournisseur | Coût | Confidentialité | Remarques |
| --- | --- | --- | --- |
| **Sans IA** | Gratuit | Seules les demandes de chiffres publics sortent | Tout fonctionne ; les agents répondent sans synthèse rédigée |
| **Ollama** sur votre ordinateur | Gratuit | Tout reste sur votre ordinateur | Nécessite l'[application Ollama](https://ollama.com/download) et assez de mémoire |
| **Google Gemini** | Gratuit dans les limites quotidiennes de Google, puis facturé sur votre propre clé | Les questions et leurs chiffres partent chez Google | Nécessite une clé d'API Gemini ; le modèle par défaut est `gemini-3.8-flash`, modifiable avec `GEMINI_MODEL` dans `.env` |
| **Ollama, puis Gemini** | Comme ci-dessus | Comme ci-dessus | Ollama d'abord ; Gemini répond quand Ollama ne répond pas |
| Serveur local compatible OpenAI (comme LM Studio) | Gratuit | Reste sur votre ordinateur | Dans Configuration avancée de l'IA ; vous indiquez l'adresse et le modèle |

### Deux rôles : modèle rapide et arbitre

| Rôle | Ce qu'il fait | Par défaut | Règle |
| --- | --- | --- | --- |
| **Modèle rapide** | Choisit les agents et rédige les réponses des bureaux | `qwen2.5:7b` (`OLLAMA_QUICK_MODEL`) | Un modèle de 7 à 8B répond en moins d'une minute sur la plupart des Mac |
| **Arbitre** | Étape finale du conseil complet, synthèses et explications du chat, débat des agents, étape Options de la revue de politique et textes d'ouverture des débats de Quêtes | `qwen2.5:32b` (`OLLAMA_DEEP_MODEL`) | 30B ou plus compte comme arbitre complet. Un modèle de 8B ou moins n'est jamais utilisé comme arbitre. Un arbitre 14B n'est permis que si vous activez **Autoriser un arbitre de 14B** (désactivé par défaut), et chaque réponse qu'il juge porte la mention « Arbitre réduit » |

### Quelle configuration pour quel ordinateur

| Votre ordinateur | Configuration recommandée |
| --- | --- |
| Portable de 4 Go | Mode léger avec une clé Google Gemini, ou sans IA |
| 8 Go | Google Gemini, ou sans IA. Un modèle local laisse trop peu de mémoire à l'application, à Docker et au navigateur |
| 16 Go | Ollama `qwen2.5:7b` pour les bureaux, avec « Ollama, puis Gemini » pour que Gemini arbitre ; ou activez un arbitre `qwen2.5:14b`, signalé « Arbitre réduit » (il demande environ moitié moins de mémoire que le 32B) |
| 32 Go ou plus, ou une carte graphique de 24 Go | Tout en local : `qwen2.5:7b` et `qwen2.5:32b` |

Téléchargez les modèles une fois avec `ollama pull qwen2.5:7b` et `ollama pull qwen2.5:32b` (ou via
`npm run go`). Sur un ordinateur sans assez de mémoire ni puce graphique, le grand modèle peut prendre
10 minutes ou plus par rapport complet ; utilisez Gemini comme arbitre, ou Ollama sur une machine plus
puissante.

### Réglages utilisés par l'application

Valeurs actuelles du code ; celles marquées « modifiable » se trouvent dans Menu > Réglages > Modèle
d'IA > Configuration avancée de l'IA.

| Réglage | Valeur | Pourquoi |
| --- | --- | --- |
| Température, synthèse et explications du chat | 0, avec la graine 42 | Les mêmes chiffres donnent la même réponse, exactement avec le même modèle Ollama sur la même machine |
| Température, étapes de la revue de politique | 0 | Une reprise donne un résultat aussi proche que possible |
| Température, textes d'ouverture des débats de Quêtes | 0, avec la graine 42, sur l'arbitre | Rédigés une fois et enregistrés avec leurs réglages |
| Température, autres étapes (bureaux du conseil complet) | 0,2 (modifiable, de 0 à 1,5) | Un peu de variété entre bureaux |
| Fenêtre de contexte (`num_ctx` d'Ollama) | 8 192 jetons (modifiable, de 1 024 à 65 536) | Assez pour la question, les chiffres et les consignes |
| Longueur maximale sur les étapes longues (`num_predict` d'Ollama) | 2 048 jetons ; 4 096 pour les modèles de raisonnement | Arrête un modèle qui continue d'écrire du remplissage |
| Attente par appel | 16 secondes par étape de bureau et 25 par étape du conseil complet (modifiable, de 5 à 180) ; au moins 120 secondes pour les étapes de l'arbitre | Une adresse injoignable échoue vite ; l'arbitre a le temps |
| Modèle gardé en mémoire (`keep_alive` d'Ollama) | 30 minutes sur les étapes longues | La question suivante ne recharge pas un modèle de 20 Go |
| Format | JSON vérifié par un schéma ; niveau de réflexion de Gemini bas | L'application lit chaque champ et vérifie chaque chiffre avec sa source |

Dans `.env` : `DEFAULT_AI_PROVIDER` (`ollama` ou `gemini`), `OLLAMA_BASE_URL`, `OLLAMA_QUICK_MODEL`,
`OLLAMA_DEEP_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `LIGHT_MODE`.

---

## Langues

| Langue | État | Forme d'adresse |
| --- | --- | --- |
| Anglais | Complet ; langue source | |
| Espagnol | Toute l'application | *Usted* |
| Français | Toute l'application | *Vous* |
| Portugais du Brésil | Toute l'application | *Você* |
| Arabe, swahili | Prévus, pas commencés | |

Chaque écran, menu, texte d'aide, entrée du glossaire et exemple guidé est traduit ; la synthèse de
politique d'une page s'imprime dans les quatre langues. Changez avec le bouton **EN / ES / FR / PT** de
l'en-tête ; le choix est gardé dans votre navigateur. Une langue n'est téléchargée que lorsqu'elle est
choisie.

Certaines choses restent telles qu'écrites, et l'application le signale : les chiffres, les noms de
sources et de séries s'affichent comme la source les donne ; le Chat du conseil et le conseil rédigent
leurs réponses dans la langue choisie (les agents comprennent encore mieux les questions en anglais) ; les notes de méthode citent des articles en anglais ; certaines
phrases que les règles de l'application écrivent sur un pays sont encore en anglais. Aucune traduction
n'a encore été relue par un locuteur natif ; toute aide est la bienvenue : les étapes et la liste des fichiers sont dans
[docs/TRANSLATION_REVIEW.md](./docs/TRANSLATION_REVIEW.md) (en anglais).

Ce README et le guide existent dans les quatre langues. Les autres documents sont en anglais.

---

## Quêtes : des solutions économiques à plusieurs

Les Quêtes transforment des questions économiques ouvertes en un jeu public avec score auquel chacun peut
participer, pour que beaucoup de personnes travaillent sur les problèmes d'un pays, confrontent leurs
raisonnements aux données et constituent un historique de qui prévoit bien. **Les Quêtes sont construites
mais désactivées.** Menu > Quêtes est grisé (« Pas encore disponible ») jusqu'à ce que chaque point de la
liste de [docs/QUESTS.md](./docs/QUESTS.md) soit coché et que le projet soit public. Pour les essayer sur
votre ordinateur, ajoutez `QUESTS_ENABLED=on` à `.env` et redémarrez.

![Menu > Quêtes avec QUESTS_ENABLED=on : liste de Quêtes en brouillon avec leur type et leur date de résultat](docs/images/18-quests.png)

**Ce qu'est une Quête.** Un fichier dans `quests/` avec une question et une règle écrite qui dit comment
elle se règle à partir des sources de l'application. Il en existe quatre types :

| Type | Exemple | Comment elle se termine |
| --- | --- | --- |
| **Prévision** | « Le taux directeur de la Turquie sera-t-il plus bas le 30 juin 2027 qu'à la clôture des participations ? » | Réglée par la source selon sa règle ; chaque participation reçoit un score |
| **Débat** | « Qu'est-ce qui reconstituerait le plus sûrement les réserves de change de l'Égypte ? » | Jamais notée. On défend une position avec les chiffres de l'application ; Claim Check compare chaque chiffre cité à celui de l'application ; après la clôture, une carte des preuves montre les arguments à côté de ce que disaient les chiffres |
| **Réplication** | « Reproduisez l'estimation de réaction budgétaire de Bohn pour le Brésil » | Chaque participation donne le chiffre produit par un script public personnel ; elle reproduit le chiffre de l'application si elle est dans la tolérance. Une participation soignée qui trouve une erreur dans l'application résout la Quête |
| **Signal** | « Un positionnement très concentré sur les contrats à terme se résorbe-t-il en six semaines ? » | On propose un test préenregistré ; chacun est exécuté une seule fois après la clôture, compté dans la correction de Holm avec tous les autres et reçoit un badge comme ceux de l'application |

**Comment fonctionne le jeu.**

- **En privé ou en public.** Enregistrez une réponse en privé sur votre ordinateur, entraînez-vous sur des
  données passées (score immédiat, rien n'est gardé) ou participez publiquement par une demande de
  modification que l'application prépare pour vous. Les personnes dans un pays que GitHub bloque peuvent
  participer par e-mail via un responsable.
- **Score face à un taux de base.** Les prévisions sont notées avec le score de Brier face à la fréquence
  passée de l'événement, et les prévisions chiffrées face à « rien ne change » : la chance et la copie
  rapportent peu.
- **Classement.** Compétence avec un intervalle à 90 %, calibration, netteté, bilan face à la foule,
  points forts par domaine et région, séries, saisons par année civile et tableau historique. Une personne
  n'est classée qu'après 12 prévisions réglées et avec un compte GitHub d'au moins 90 jours ; personne
  n'est classé sur le nombre de Quêtes jouées. Débats, réplications et tests sont listés sur la page de
  chaque participant, sans classement.
- **Rien ne peut être modifié après coup.** Les Quêtes approuvées portent une empreinte ; les résultats
  sont écrits dans un registre chaîné par hachage qui échoue si une ligne est modifiée ; les contestations
  sont tranchées en public.
- **Ouvert à qui n'a pas l'application.** Une page publique statique (`npm run quests:board`) affiche les
  tableaux, les résultats et la foule face au taux de base, et un jeu de données ouvert annuel peut être
  déposé avec un DOI.
- **Des règles qui le gardent sain.** Aucun chiffre écrit dans un fichier de Quête ; les Quêtes de
  prévision ne se règlent que sur des sources dont les conditions permettent le partage avec attribution ;
  les questions sur les conflits, les troubles ou les victimes ne se posent qu'en Débats ; ni mises ni
  prix. Les Quêtes ne sont pas un marché de paris.
- **En classe.** Les enseignants peuvent utiliser les Quêtes avec un code de classe et un tableau de
  classe privé ; un pilote d'un semestre avec deux professeurs est prévu.

Quatorze Quêtes en brouillon se trouvent dans `quests/drafts/` ; aucune n'est encore approuvée. Les règles
complètes, les étapes du responsable et la liste de lancement sont dans [docs/QUESTS.md](./docs/QUESTS.md)
(en anglais).

---

## D'où viennent les données

Toutes sont gratuites. Quelques-unes demandent une clé gratuite, à ajouter dans Menu > Réglages.

| Domaine | Sources |
| --- | --- |
| Croissance, dette, budgets, commerce | Banque mondiale (indicateurs et statistiques de dette), FMI (Perspectives de l'économie mondiale et éditions passées, réserves, balance des paiements, composition des réserves, dépenses publiques par fonction), OCDE (indicateurs avancés, prix, PIB trimestriel, via DBnomics), prix à la consommation mensuels du FMI, Eurostat, UN Comtrade et WITS |
| Taux et obligations | Courbe quotidienne des rendements au pair du Trésor américain et courbe des taux des emprunts d'État de la zone euro de la BCE (toutes les échéances, chaque jour), BRI (taux directeurs, titres de dette, taux de change réels, actifs totaux des banques centrales, crédit en dollars aux agents non bancaires), lignes de swap en dollars de la Fed de New York, taux directeurs mensuels du FMI (statistiques monétaires et financières) pour les pays que la BRI ne couvre pas, FRED (rendements officiels à 10 ans ; clé gratuite), Fed de New York, Trésor américain (détenteurs étrangers, adjudications), Trésor brésilien, banque centrale du Pérou (écarts EMBIG), et rendements à 10 ans de l’OCDE et taux de change H.10 de la Réserve fédérale, mensuels depuis 1990 via FRED, pour rejouer les crises passées |
| Change et matières premières | Taux de change au comptant (open.er-api.com), taux de référence de la BCE, taux de change mensuels du FMI pour les monnaies sans taux officiel quotidien (par exemple le naira, le shilling et le cedi), prix des matières premières de la Banque mondiale (Pink Sheet ; riz, blé, maïs et soja depuis 1960), prix du pétrole de l'EIA (clé gratuite), la classification des régimes de change d'Ilzetzki, Reinhart et Rogoff (un classeur que vous enregistrez ; les auteurs demandent une citation et n'indiquent pas de licence) |
| Enquêtes et anticipations | Enquêtes auprès des entreprises et des consommateurs de l'UE (Commission européenne, via Eurostat ; substitut gratuit des PMI payants, signalé comme tel), enquête de la BCE auprès des prévisionnistes professionnels, enquête Focus du Brésil, indice de tension des chaînes d'approvisionnement de la Fed de New York ; pour les surprises dans les données, les prix à la consommation américains du BLS et le marché de l'IPC de Kalshi tel qu'enregistré avant chaque publication |
| Budgets, projets et régions | Exécution budgétaire de la Banque mondiale tirée des évaluations PEFA (cible 16.6.1 de l'ONU), projets de la Banque mondiale et état des crédits de l'IDA, production par habitant par région de DOSE (Wenz et al. 2023, CC BY 4.0), chiffres d'Eurostat pour les régions de l'UE et indice de développement humain infranational de Global Data Lab (un fichier que vous enregistrez ; conditions non commerciales). Votre propre fichier de dépenses mensuelles pour le suivi de l'exécution du budget reste sur votre ordinateur |
| Banques centrales et calendrier | Banco Central do Brasil, Banco de México (jeton gratuit), dates officielles des décisions (désormais aussi Kenya, Ghana, Tanzanie et Inde) et cibles d'inflation, chacune lue sur la page de la banque elle-même, dates de publication de l'IPC et du PIB des instituts statistiques |
| Institutions et ouverture | Indicateurs de gouvernance de la Banque mondiale (WGI), indice d’ouverture du compte de capital de Chinn et Ito (téléchargé sur votre ordinateur au plus une fois par mois, cité comme Chinn et Ito 2006 et jamais retransmis) |
| Politique, conflits et transport maritime | Actualités GDELT, données de conflit UCDP et ACLED (ACLED se télécharge à la main), listes de sanctions de l'OFAC et de l'ONU, indice de risque géopolitique, IMF PortWatch |
| Marchés et positionnement | Marchés de prédiction Kalshi et Polymarket, rapport Commitments of Traders de la CFTC |
| Pays à revenu plus faible | Banque mondiale (envois de fonds et leur coût d'envoi, comptes Global Findex, aide reçue telle que republiée à partir de l'OCDE, sécurité alimentaire, part des matières premières dans les échanges et termes de l’échange) ; deux fichiers que vous enregistrez vous-même : les prix à la consommation de FAOSTAT pour l'inflation alimentaire, et les catastrophes naturelles d'EM-DAT, téléchargées avec votre propre compte EM-DAT gratuit (ses conditions ne permettent pas à l'application de les fournir) |
| Météo et aléas naturels | NASA POWER (température et pluie mensuelles dans chaque capitale depuis 1981), portail climatique de la Banque mondiale (moyennes par pays de CRU TS depuis 1901, CC BY 4.0), trajectoires des cyclones tropicaux IBTrACS de la NOAA depuis 1980 (téléchargées seulement quand vous appuyez sur le bouton, ou lues dans un fichier que vous enregistrez) |

La liste complète est dans [docs/DATA_SOURCES.md](./docs/DATA_SOURCES.md) et ce que permet chaque source
dans [docs/DATA_LICENCES.md](./docs/DATA_LICENCES.md) (en anglais).

---

## Comment le vérifier

- **Chaque chiffre porte sa source et sa date**, et Menu > État des données montre si chaque source
  arrive toujours et si un chiffre a été révisé depuis son premier affichage.
- **Les signaux et les modèles sont testés avant qu'on s'y fie.** Chaque test est écrit et doté d'une
  empreinte *avant* d'être lancé (préenregistrement), n'utilise que des données disponibles à l'époque,
  compte les coûts de transaction et est vérifié par rééchantillonnage. Les résultats sont corrigés de la
  chance sur l'ensemble des tests (correction de Holm). Un test échoué est enregistré comme tel et n'est
  jamais réajusté.
- **Badges** : Validé, Provisoire, En cours d'examen, Retiré ou Revue due. La plupart des signaux n'ont
  pas réussi leur test, et l'application le dit.
- **Un journal d'audit** garde ce qui a été demandé, quels chiffres ont servi et qui a validé un rapport.
- **Outils de recherche externes** (facultatif, désactivé par défaut) : si vous avez votre propre serveur
  d'outils de recherche, vous pouvez saisir son adresse et sa clé dans **Menu > Réglages > Outils de
  recherche**. Dans le chat du Conseil, le **desk quantitatif** répond alors aux questions sur les
  backtests, prévisions, volatilité, nowcasts, prix d'options, baisses maximales ou ratios de Sharpe, et
  affiche chaque chiffre avec son lien, la date de ses données et l'étiquette du serveur (résultat
  hypothétique sur données passées, pas une recommandation). Chaque appel figure dans le journal d'audit,
  jamais la clé ([docs/RESEARCH_TOOLS.md](./docs/RESEARCH_TOOLS.md), en anglais).

La méthode complète est dans [docs/METHODOLOGY.md](./docs/METHODOLOGY.md) (en anglais).

---

## Feuille de route

Où en est le projet au 24 novembre 2026 (détail dans [docs/ROADMAP.md](./docs/ROADMAP.md), en anglais) :

**Fait**

1. **Citations, maintenance et retours** : « Citer » sur chaque graphique, tableau et réponse, une revue
   de taille, un contrôle mensuel des sources et la confrontation des revues de politique passées avec
   ce qui s’est produit.
2. **Les chiffres dont un terminal complet a besoin** : inégalités, recettes fiscales et droits de
   douane, dette des pays à faible revenu, population, commerce et structure de la dette, climat,
   salaires et prix des logements, soldes sectoriels, activité mensuelle, et chiffres de la zone euro et
   du Royaume-Uni tels que publiés la première fois (les recettes par État sont une seconde étape qui
   attend un contrôle de couverture).
3. **Outils d’analyse et de politique** : alerte précoce de crise, soutenabilité extérieure, courbe des
   taux, moteurs de l’inflation, comptabilité de la croissance, un calculateur de restructuration, la
   finance comportementale et une revue de politique plus complète avec précédents, règles
   budgétaires, faisabilité politique, un graphique d’arbitrages et une note d’une page.
4. **Des données pour les pays à revenu plus faible** (avancées le 13 novembre) : envois de fonds,
   inclusion financière, prix des matières premières et termes de l’échange, aide reçue, prix
   alimentaires et catastrophes naturelles.
5. **Outils pour la revue de politique** (avancés le 13 novembre) : comparaison avec des pairs, alertes
   sur la page d’accueil et comparaison d’une revue avec la précédente.
6. **Connexion avec d’autres systèmes** (13 novembre) : jetons d’API, événements et webhooks,
   surveillances d’indicateurs, instantanés de pays, positions envoyées de l’extérieur, noms masqués,
   scénarios et rejeux de crises, un journal d’audit scellé, un guide de déploiement et la connexion
   par OpenID Connect.
7. **Langues et enseignement** : toute l’application en portugais et quatre exemples guidés.
8. **Données de marchés et de financement** (avancées le 14 novembre) : comment la monnaie est gérée
   dans les faits (régime de change), les bilans des banques centrales et la tension sur le
   financement en dollars (crédit en dollars de la BRI et lignes de swap de la Réserve fédérale). Les
   contrôles de capitaux sont couverts par l’indice de Chinn et Ito.
9. **Conseil des politiques** (14 novembre) : dans une revue de politique, peser une mesure avec ses
   coûts et avantages, qui gagne et qui perd, les effets de second ordre et des scénarios, ou peser ce
   qu’un événement signifie pour la monnaie ou les obligations d’État ; le conseil classe les options
   face à elle et la synthèse d’une page reprend le résultat.
10. **Météo et assurance** (14 novembre) : météo dans la capitale et sur tout le pays, prix
    alimentaires depuis 1960, un outil de conception de déclencheur d’assurance paramétrique avec coût
    de sinistralité, prix équitable, périodes de retour et risque de base, un modèle de pertes dues aux
    catastrophes à partir d’EM-DAT et les trajectoires des cyclones tropicaux.
11. **Questions depuis un autre programme et pages plus claires** (15 et 16 novembre) : un autre
    programme peut poser une question au Chat du conseil avec un jeton `ask:council` ; Rapports en
    onglets, et Historique et données sous forme de graphique suivi d'un menu d'outils, un par un.
12. **Questions « et si... ? »** (17 novembre) : le Chat du conseil lit le changement qu'énonce une
    question, le Scenario Agent met les chiffres d'aujourd'hui à côté des chiffres après le changement,
    avec ce que montrent l'histoire et la recherche publiée, la réponse arrive en huit parties et les
    ampleurs peuvent être modifiées pour reposer la question.
13. **Cinq profils d'utilisateur** (17 novembre) : pour les administrations, crédibilité et exécution du
    budget et projets de la Banque mondiale ; pour les élus, chiffres régionaux et un résumé simple pour
    les citoyens ; pour les chercheurs, un dossier de document de travail et une vérification de
    réplication ; pour les économistes, fourchettes tirées des erreurs passées des prévisions ; pour les
    opérateurs de marché, courbes de taux complètes, surprises dans les données et indice de surprises
    d'inflation.
14. **Outils de recherche externes** (17 novembre) : le Chat du conseil peut appeler un serveur d'outils
    de recherche que vous faites tourner, par le desk quantitatif ; éteint par défaut.
15. **Meilleure couverture des pays à faible revenu** (17 novembre) : les pays que vous ajoutez
    (Recherche > Un pays > Ajouter un pays) sont enregistrés par le téléchargement quotidien comme les
    pays intégrés, avec historique, vues « à une date » et alertes ; une liste de suivi **Pays à faible
    revenu** des 15 plus grands par région (Inde, Pakistan, Nigeria, Bangladesh, Éthiopie, Égypte,
    Philippines, RD Congo, Viêt Nam, Tanzanie, Kenya, Myanmar, Ouganda, Ghana et Bolivie) ; taux de
    change et taux directeurs mensuels du FMI là où il n'existe ni chiffre quotidien ni chiffre de la
    BRI, utilisés aussi par la prévision immédiate et les prévisions d'inflation et la prévision du
    taux directeur ; et cibles d'inflation et dates de décision lues sur les pages des banques
    elles-mêmes.
16. **Améliorations rapides issues de la comparaison avec d’autres plateformes** (23 novembre) : les
    feuilles de calcul se mettent à jour depuis l’application (un assistant Power Query pour Excel et
    un script pour Google Sheets) ; prévisions officielles côte à côte (le FMI, la Banque mondiale et
    l’OCDE, avec l’écart entre elles) dans Historique et données ; et jours de publication, où
    l’application relit chaque heure les sources d’IPC et d’activité mensuelle jusqu’à l’arrivée du
    nouveau mois, dans Aujourd’hui.

17. **Combler les écarts avec les plateformes de référence** (23 novembre) : des prévisions écrites
    avant que les chiffres existent et notées chaque mois ; une recherche dans tous les catalogues
    gratuits (Menu > Chercher des données) ; des VAR bayésiens et structurels dans l’Agent graphiques ;
    un petit modèle d’économie ouverte estimé et testé avant d’être affiché ; des chiffres en temps
    réel pour les 38 membres de l’OCDE ; documents officiels et discours de banquiers centraux par
    pays ; un rapport pays hors ligne, un laboratoire macro et un exemple guidé sur les matières
    premières ; commentaires et liens en lecture seule sur un serveur domestique ; cours en direct de
    votre propre compte Interactive Brokers, affichés à l’écran uniquement ; réponses du conseil en
    espagnol, français ou portugais ; cibles d’inflation et dates de décision pour davantage de pays à
    faible revenu ; une procédure de relecture des traductions par des locuteurs natifs ; et la
    propagation des chocs entre économies (un petit VAR global avec des pondérations commerciales du
    FMI). Le cadre de la dette des pays à faible revenu attend sa note d’orientation de 2027.
18. **Méthodes de prévision et bilan des signaux** (19 au 23 novembre) : volatilité des changes GARCH,
    estimations du trimestre en cours par ridge, lasso, forêt aléatoire et facteur dynamique, ARIMA,
    fourchettes de croissance par quantiles, le test KPSS, des tests sur les chiffres tels que publiés
    la première fois et le test de la fiche de risque pays. 39 tests sont au dossier : 11 réussis, dont
    8 tiennent encore une fois le nombre de tests pris en compte. Les verdicts sont copiés depuis de
    vraies exécutions avec `npm run track-record:import`, jamais à la main.
19. **Une première prise en main plus simple** (24 novembre) : une carte de démarrage en trois étapes ;
    une réponse courte en tête du Chat du conseil quand aucun modèle d'IA n'en rédige ; une liste des
    Manquant plus courte et plus de place pour la réponse ; Revue de politique comme page à part à côté
    de Rapports ; et le bouton d'aide présenté comme une liste des quatre niveaux.
20. **Se rétablir seule** (24 novembre) : des mises à jour qui ne s'arrêtent pas sur les fichiers que
    l'application écrit elle-même ; les sources lentes ou occupées interrogées de nouveau avant d'être
    comptées en échec ; un second essai pour les téléchargements échoués à la fin du passage quotidien
    et d'autres essais après deux heures ; et la dernière bonne réponse, avec ses propres dates, tant
    qu'une source ne répond pas.
21. **Fonctions habituelles d'une application** (24 novembre) : une page sur la confidentialité
    ([docs/PRIVACY.md](./docs/PRIVACY.md), en anglais), un avis quand une nouvelle version sort, Copier
    les détails et Signaler un problème, une question avant de supprimer une liste de suivi, le suivi
    du mode clair ou sombre de l'ordinateur, les étapes pour retirer l'application et des raccourcis
    clavier.
22. **Vérification avant publication et pays les plus pauvres** (25 novembre) : une deuxième revue de
    sécurité et une politique de sécurité plus stricte pour les pages de l'application compilée ;
    Ajouter un pays propose tous les pays, pas seulement ceux de la carte du monde ; les 59 pays de la
    liste de dette des pays à faible revenu du FMI et de la Banque mondiale (Malawi, Sierra Leone,
    Haïti, Népal, les petits États insulaires et d'autres) figurent dans toutes les listes de pays, et
    le téléchargement quotidien les enregistre dès qu'ils sont dans une liste de suivi ; et la
    vérification automatique sous Windows passe.

**Ensuite**

- **La publication** sur e-conquest/econquest. Le mode léger, les deux revues de sécurité et la
  vérification automatique sous Windows sont faits ; il reste un premier démarrage par une personne
  sur un ordinateur Windows, une mesure du mode léger et un dernier export public.
- **Le point d’étape 1**, environ quatre semaines après la publication, est la seule revue avant de
  planifier d’autres travaux. L’usage réel décide de la suite ; aucune nouvelle fonction n’est ajoutée
  avant.

**En attente**

- **Les Quêtes en classe** : le plan est complet (13 petites modifications, puis un pilote d’un semestre
  avec deux professeurs) ; la construction commence quand le responsable du projet le décide.
- **Arabe et swahili** : prévus, mis en pause par le responsable du projet.
- **L’application mobile** : en pause jusqu’après la publication.
- **Vérifications sur l’ordinateur du responsable** : certaines sources (météo, trajectoires des
  tempêtes, actifs des banques centrales, financement en dollars, fichier des régimes de change) sont
  construites et testées sur des réponses enregistrées, mais n’ont pas pu être jointes depuis la
  machine de compilation ; `npm run check:data` sur un ordinateur qui les atteint confirme chacune. Les
  sources des cinq profils d'utilisateur y ont répondu le 17 novembre. Les taux de change, taux
  directeurs et taux du marché local mensuels du FMI y ont répondu les 18 et 19 novembre. Les
  prévisions officielles, les éditions en temps réel de l'OCDE et la recherche dans les catalogues
  (lignes `wb_gep`, `oecd_eo`, `oecd_rtd` et `catalogues`) y attendent leur premier contrôle. Le desk quantitatif attend un
  premier essai avec un vrai serveur d'outils de recherche, et les surprises dans les données ont besoin
  de quelques semaines de téléchargements quotidiens pour s'accumuler.

---

## Documentation

- [docs/GUIDE.fr.md](./docs/GUIDE.fr.md) : guide pas à pas avec captures, en français
- En anglais : [INSTALL.md](./docs/INSTALL.md) (installation), [USER_MANUAL.md](./docs/USER_MANUAL.md)
  (manuel), [GLOSSARY.md](./docs/GLOSSARY.md) (glossaire ; aussi dans l'application en français),
  [METHODOLOGY.md](./docs/METHODOLOGY.md), [HOW_IT_WORKS.md](./docs/HOW_IT_WORKS.md), [METHODS.md](./docs/METHODS.md),
  [TRACK_RECORD.md](./docs/TRACK_RECORD.md), [DATA_SOURCES.md](./docs/DATA_SOURCES.md),
  [DATA_LICENCES.md](./docs/DATA_LICENCES.md), [DATA_API.md](./docs/DATA_API.md), [DEPLOYMENT.md](./docs/DEPLOYMENT.md),
  [POLICY_REVIEW.md](./docs/POLICY_REVIEW.md), [QUESTS.md](./docs/QUESTS.md),
  [ROADMAP.md](./docs/ROADMAP.md), [HOME_SERVER.md](./docs/HOME_SERVER.md),
  [PRIVACY.md](./docs/PRIVACY.md), [SECURITY.md](./docs/SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md)
- Développeurs : [partie For developers du README anglais](./README.md#for-developers)

---

## Licence

Code : [Apache License 2.0](./LICENSE). Documentation, notes de méthode, registres de validation, captures
d'écran et contenu des Quêtes : [CC BY 4.0](./LICENSE-docs.md). Les chiffres des sources externes gardent
leurs propres conditions ([docs/DATA_LICENCES.md](./docs/DATA_LICENCES.md)). Les contributions sont signées
selon le Developer Certificate of Origin (DCO). Pour citer le logiciel, utilisez
[CITATION.cff](./CITATION.cff).
