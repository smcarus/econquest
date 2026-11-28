# Enseigner avec EconQuest

**Version 1.0, 28 novembre 2026.** Sous licence [CC BY 4.0](../LICENSE-docs.md).

Un guide pour les enseignants qui veulent utiliser les quêtes d'EconQuest avec une classe : des
prévisions et des débats sur des données économiques réelles, notés quand les données arrivent. Il
couvre un semestre entier, de l'installation à la fin de la classe. Rien ici ne demande de
programmer. Chaque étape nomme le bouton sur lequel appuyer.

Aussi en [English](./TEACHING.md) et en [Español](./TEACHING.es.md). Pour le service informatique de
l'établissement, il existe un résumé d'une page : [SCHOOL_IT.md](./SCHOOL_IT.md) (en anglais). La
description complète de chaque fonction de classe se trouve dans
[QUESTS.md](./QUESTS.md#classes-quests-in-the-classroom) (en anglais).

## Ce qu'une classe y trouve

- **Des questions sur des données réelles.** Une quête de prévision demande par exemple : « Le Brent
  sera-t-il plus haut le 29 janvier qu'à la clôture des réponses ? » Les étudiants répondent par une
  probabilité (70 %) ou par un nombre. À la date prévue, l'application lit la réponse dans la série
  officielle et la note. Personne, pas même l'enseignant, ne peut changer le résultat.
- **Des débats.** Une quête de débat propose deux à quatre positions. Chaque étudiant en choisit une
  et la défend. Les débats sont argumentés, pas notés par un chiffre.
- **Un historique qui apprend la calibration.** Chaque étudiant voit à quelle fréquence ses réponses
  à 70 % se sont réalisées, et s'il a fait mieux que le taux de base. Qui dit 70 % devrait avoir
  raison environ 7 fois sur 10.
- **Aucun chiffre inventé.** Chaque chiffre vient d'une source publique. Quand une source ne répond
  pas, l'application indique « Manquant » et explique pourquoi ; elle ne comble jamais le vide.
- **C'est l'enseignant qui note.** L'application donne des chiffres (participation, exactitude,
  calibration). Elle ne donne jamais de note d'elle-même.

Une bonne prévision peut se révéler fausse, et une prévision négligée peut tomber juste. Les écrans
le rappellent partout où des résultats apparaissent. Notez le raisonnement autant que le résultat.

## Avant le semestre

### 1. Choisissez où l'application fonctionne

EconQuest fonctionne sur un seul ordinateur : votre portable ou un serveur de l'établissement. Les
étudiants l'ouvrent dans un navigateur ordinaire sur le même réseau ; rien n'est installé sur leurs
appareils. Un portable modeste suffit pour une classe de 40 : lors du test de charge
(`npm run class:load`), chaque étape pour 40 étudiants a répondu en une seconde environ, avec
l'application limitée à deux cœurs. Gardez l'ordinateur allumé et éveillé pendant le cours.

Envoyez [SCHOOL_IT.md](./SCHOOL_IT.md) au service informatique. Il indique le port utilisé par les
étudiants (3000), qu'il n'y a rien à ouvrir vers internet et ce qui est enregistré.

### 2. Préparez-la pour la classe

Après avoir installé l'application ([INSTALL.md](./INSTALL.md)), lancez une fois, dans son dossier :

```
npm run class:setup -- --until 2027-05-07 --admin votrenom
```

Indiquez le dernier jour du semestre après `--until`. Cette commande :

- active les classes et ouvre l'application au réseau de l'établissement ;
- crée votre compte administrateur (le mot de passe s'affiche une fois ; changez-le dans
  Menu > Compte) ;
- garde cette version jusqu'au dernier jour du semestre, pour que rien ne change pendant le cours ;
- affiche l'adresse que les étudiants ouvrent, par exemple `http://192.168.1.20:3000`.

Démarrez ensuite l'application comme d'habitude (`npm run go` sur un Mac, `npm run dev` sur tout
ordinateur). Ajoutez `--local` pour l'essayer d'abord sur votre seul ordinateur.

### 3. Créez la classe

Connectez-vous, ouvrez **Menu > Quêtes** et choisissez l'onglet **Classes**.

1. Dans *Créer une classe*, indiquez un nom (« Macro 101 »), le fuseau horaire de la classe, le nom
   du semestre et ses premier et dernier jours. Appuyez sur *Créer la classe*.
2. La carte de la classe affiche un **code d'accès** de huit caractères, comme `K7QM-P3XD`.
3. Ajoutez les étudiants de l'une de deux façons :
   - **Comptes étudiants :** collez une liste de pseudonymes (un par ligne) dans *Créer des comptes
     étudiants* et appuyez sur *Créer les comptes*. Chaque mot de passe s'affiche une fois :
     distribuez-les, et chaque étudiant change le sien dans Menu > Compte. Les pseudonymes évitent
     d'enregistrer les vrais noms si vous le préférez.
   - **Code d'accès :** les étudiants qui ont déjà un compte se connectent et saisissent le code
     dans leur onglet Classes.
4. Pour partager la correction, ajoutez le compte d'un collègue comme **correcteur** (*Ajouter une
   personne qui a déjà un compte*). Les correcteurs voient toutes les réponses et écrivent des
   commentaires ; ils ne modifient pas la classe.

Les étudiants voient la classe, le semestre et qui l'enseigne. Ils ne voient jamais les noms de
leurs camarades dans la liste des membres, ni le code d'accès.

### 4. Préparez les premières semaines avec les rejeux

Les vraies quêtes de prévision mettent des semaines à se résoudre. Pour s'exercer dès le premier
jour, utilisez l'onglet **Rejeux** : quatre séries de quatre semaines (pétrole et devises pour
débuter, puis taux directeurs, taux de change et positionnement). Chaque essai choisit une date
passée, montre ce que l'on savait alors et note la réponse aussitôt. L'étudiant voit à quelle
fréquence il a fait mieux que le taux de base.

## Pendant le semestre

### Donnez une quête à la classe

Sur la carte de la classe, appuyez sur *Donner une quête à cette classe* :

- **Quête :** toute quête approuvée, ou une **quête de la classe** que vous écrivez pour cette classe
  seulement (appuyez sur *Écrire une quête de la classe* : une prévision sur l'une des séries qu'une
  quête peut lire, ou un débat de deux à quatre positions, avec un niveau : initiation,
  intermédiaire ou avancé). L'application vérifie une quête de la classe avec les mêmes règles que
  toute autre quête.
- **Date et heure de remise,** dans le fuseau horaire de la classe. Chacun la voit aussi à sa propre
  heure. Chaque étudiant peut télécharger un fichier de calendrier avec ses échéances.
- **La règle sur les outils d'IA :** autorisés ; autorisés avec une note qui dit comment ils ont été
  utilisés ; ou interdits, et l'étudiant confirme qu'il ne les a pas utilisés.
- **Des consignes,** s'il y a lieu.
- **Relecture entre pairs** (quêtes de débat) et **sujet sensible** (voir plus bas), si vous le
  souhaitez.

Les étudiants remettent avant leur échéance ; une nouvelle réponse avant cette heure remplace la
précédente. Vous pouvez donner plus de temps à un étudiant (les autres ne le voient pas). Les
étudiants voient les réponses de leurs camarades seulement après la dernière échéance, ou quand vous
appuyez sur *Montrer les réponses aux étudiants maintenant*.

Pour reprendre le travail du semestre précédent, utilisez *Copier les devoirs d'une autre de vos
classes* : les dates se décalent de l'écart entre les deux semestres.

### Commentaires et notes

Appuyez sur *Réponses* dans un devoir. Sous chaque réponse, écrivez un commentaire et, si vous le
souhaitez, une note courte (« B+ », « 7/10 », « 85 % »). Un nouveau commentaire de votre part
remplace le précédent. L'étudiant le lit dans *Commentaires* sur son devoir, avec le nom de son
auteur.

### Relecture entre pairs sur les débats

Sur une quête de débat, appuyez sur *Activer la relecture entre pairs* (ou cochez-la en donnant la
quête). Quand l'échéance de tous est passée, chaque étudiant qui a défendu une position reçoit les
arguments de deux camarades, appelés Camarade A et B, et écrit ce qui est solide dans chacun et ce
qui le rendrait plus solide. Personne ne relit son propre argument ; chaque argument reçoit deux
relectures ; les auteurs lisent les relectures sans le nom de leurs auteurs. Vous voyez qui a écrit
quoi.

### Sujets sensibles

Pour une question que les étudiants pourraient vivre comme personnelle, appuyez sur **Marquer comme
sujet sensible** (ou cochez-le en donnant la quête). Les noms sont alors cachés aux étudiants et aux
correcteurs (vous les voyez toujours), et ces réponses ne quittent jamais cet ordinateur : elles ne
figurent ni dans le carnet de notes, ni dans aucun téléchargement, ni dans aucune sauvegarde. Une
fois des réponses reçues, l'option ne peut plus être désactivée, car les étudiants ont répondu sur
cette promesse.

### Le tableau de la classe, les équipes et les bilans

- **Tableau de la classe :** note les réponses déjà résolues. Choisissez ce que voient les
  étudiants : seulement leur propre ligne, leurs camarades par pseudonyme, ou leurs camarades sous
  forme de numéros.
- **Équipes :** formez des équipes de 3 à 5 qui partagent une ligne du tableau.
- **Bilan :** une page imprimable pour un étudiant avec ses réponses, ses résultats, les commentaires
  reçus et, après 10 probabilités résolues, un graphique de calibration accompagné d'une courte note
  sur les cas où il était trop sûr ou pas assez. Chaque étudiant ouvre le sien avec *Mon bilan*.

### Étudiants qui travaillent sur leur propre copie

Un étudiant qui ne peut pas joindre l'ordinateur de la classe (chez lui, ou sur un autre réseau)
peut remettre son travail par fichier :

1. Dans le devoir, appuyez sur **Télécharger la feuille de remise** et envoyez le fichier à
   l'étudiant.
2. Sur sa propre copie d'EconQuest, l'étudiant ouvre **Menu > Quêtes > Remettre**, ouvre la feuille,
   écrit sa réponse, appuie sur **Sceller et enregistrer le fichier**, puis vous renvoie le fichier.
3. Appuyez sur **Charger des fichiers scellés** et choisissez les fichiers (plusieurs à la fois,
   c'est possible).

Seule la copie de votre classe peut ouvrir un fichier scellé, et toute modification est détectée.
Chaque fichier se charge une seule fois. L'heure qu'il contient vient de l'ordinateur de l'étudiant
et elle est présentée comme telle ; un fichier scellé après l'échéance est chargé et marqué en
retard. Vous et l'étudiant voyez la même empreinte courte : vous savez ainsi tous deux qu'il s'agit
du même fichier.

## Fin du semestre

### Le carnet de notes

Ouvrez **Carnet de notes** sur la carte de la classe. Chaque étudiant a quatre parties sur 100 :

| Partie | Ce qu'elle mesure |
| --- | --- |
| Participation | La part des devoirs remis |
| Exactitude | 100 × (1 − score de Brier moyen). Dire toujours 50 % donne 75 |
| Calibration | À quel point ses réponses à 70 % se sont réalisées 70 % du temps (après 10 réponses résolues) |
| Notes | Les notes que vous et vos correcteurs avez données et qui se lisent comme un nombre, une fraction ou une lettre |

Fixez vos propres pondérations (leur total fait 100 ; 25, 25, 20 et 30 tant que vous ne les changez
pas). Une partie encore sans chiffre répartit son poids sur les autres. Appuyez sur *Télécharger le
carnet de notes (CSV)* pour obtenir un fichier à ouvrir dans un tableur. Les quêtes retirées ou
impossibles à résoudre ne comptent pas. Chaque étudiant peut télécharger son propre relevé avec
*Télécharger mon relevé (CSV)*.

### Archivage et suppression

Une classe est archivée 30 jours après le dernier jour du semestre. Une classe archivée est en
lecture seule : le carnet de notes et les bilans restent consultables et téléchargeables. Vous
choisissez combien de temps elle est conservée, de 30 jours à 10 ans (un an tant que vous ne le
changez pas). Chaque membre voit le jour de sa suppression, avec un avertissement pendant ses 30
derniers jours. Ce jour-là, la classe est supprimée avec ses réponses, commentaires, relectures et
quêtes de la classe. Restaurer une classe archivée annule sa suppression.

## Confidentialité, en bref

- Tout reste sur l'ordinateur où fonctionne l'application. Il n'existe aucun service EconQuest en
  ligne.
- Les fichiers de la classe ne sont lisibles que par l'utilisateur de l'application sur cet
  ordinateur.
- Les étudiants voient les réponses de leurs camarades seulement après l'échéance, et jamais sur un
  sujet sensible.
- Chaque modification d'une classe est inscrite dans le journal d'audit.
- La liste complète de ce qui est enregistré se trouve dans [PRIVACY.md](./PRIVACY.md) (en anglais).

## Accessibilité

Les écrans de classe sont conçus d'abord pour la largeur d'un téléphone et vérifiés à chaque
modification selon les niveaux A et AA des WCAG 2.2 : un nom pour chaque bouton et chaque champ, le
contraste, un focus clavier visible, et rien qui oblige à faire défiler de côté à 320 pixels de
large. Voir [ACCESSIBILITY.md](./ACCESSIBILITY.md) (en anglais).

## Un semestre type (12 semaines)

| Semaine | En cours | Dans EconQuest |
| --- | --- | --- |
| 1 | Qu'est-ce qu'une prévision ; probabilités et taux de base | Rejeux : pétrole et devises, semaines 1 et 2 |
| 2 | Règles de notation : pourquoi le score de Brier récompense la probabilité à laquelle on croit vraiment | Rejeux : semaines 3 et 4 ; premier coup d'œil à *Mon bilan* |
| 3 | Prix des matières premières et termes de l'échange | Première quête de prévision (résolue dans 6 semaines environ) |
| 4 | Banques centrales et taux directeurs | Rejeux : taux directeurs ; deuxième quête de prévision |
| 5 | Taux de change | Rejeux : taux de change |
| 6 | Défendre une position de politique économique | Quête de débat avec relecture entre pairs |
| 7 | Lire les relectures entre pairs | Commentaires sur le débat |
| 8 | Inflation | Quête de prévision sur l'inflation ou quête de la classe |
| 9 | Premiers résultats : chance et compétence | Tableau de la classe et graphiques de calibration |
| 10 | Politique budgétaire et dette | Quête de débat |
| 11 | Réviser ses prévisions | Dernière quête de prévision |
| 12 | Révision | Bilans imprimés ; carnet de notes téléchargé |

## En cas de problème

| Ce que vous voyez | Que faire |
| --- | --- |
| Les étudiants ne peuvent pas ouvrir l'adresse | Vérifiez que l'application tourne et que l'ordinateur et les étudiants sont sur le même réseau. Si le wifi de l'établissement isole les appareils, demandez au service informatique d'autoriser le port 3000 vers cet ordinateur (voir SCHOOL_IT.md). |
| Un chiffre indique « Manquant » | La source n'a pas répondu ou n'a pas encore publié. La raison est affichée. La quête se résout quand le chiffre arrive. |
| Un étudiant a oublié son mot de passe | Un administrateur le réinitialise dans Menu > Utilisateurs ; le nouveau mot de passe s'affiche une fois. |
| « Too many class requests » (le message s'affiche en anglais) | Quelqu'un a appuyé très vite ; attendez quelques secondes. |
| Un fichier scellé est refusé | Le message dit pourquoi : modifié, fait pour une autre classe ou un autre devoir, déjà chargé, ou le nom d'utilisateur n'est pas celui d'un étudiant de cette classe. |
| La classe est en lecture seule | Le semestre s'est terminé il y a plus de 30 jours et la classe a été archivée. Restaurez-la sur sa carte si vous devez modifier quelque chose. |

Questions et problèmes : ouvrez une *issue* sur la page GitHub du projet, ou écrivez à l'adresse
indiquée dans [SECURITY.md](./SECURITY.md) pour toute question de sécurité.
