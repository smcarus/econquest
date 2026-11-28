# Défi de réplication de Bohn (1998)

**Langues :** [English](README.md) · [Español](README.es.md) · Français · [Português](README.pt.md)

Ce dossier accompagne la quête **« Reproduisez l’estimation de réaction budgétaire de Bohn pour le Brésil »** (`bra-bohn-replication`). Vous reconstruisez un chiffre affiché par l’application, avec votre propre code, à partir des mêmes données publiques. Si beaucoup de personnes obtiennent le même chiffre, les lecteurs peuvent faire confiance à l’application. Si un script soigneux obtient un autre chiffre, l’application se trompe peut-être, et cela tranche aussi la quête.

## L’idée en termes simples

En 1998, Henning Bohn s’est posé une question simple sur les États-Unis : quand la dette publique est élevée, le gouvernement dégage-t-il l’année suivante des excédents budgétaires plus importants (avant intérêts) ? Si oui, la dette tend à redescendre avec le temps. Une réaction positive indique que, sur les années étudiées, la dette est restée sur une trajectoire soutenable. L’absence de réaction ne prouve pas que la dette est insoutenable ; elle signifie seulement que l’historique ne donne pas cette assurance.

L’application pose la même question pour tout pays disposant d’un historique FMI suffisant. Pour cette quête, le pays est le Brésil.

L’équation est :

    solde primaire(t) = a + rho × dette(t−1) + gamma × écart de production(t) + erreur

- **solde primaire** : le solde budgétaire de l’État avant paiement des intérêts, en % du PIB (Moniteur des finances publiques du FMI).
- **dette(t−1)** : la dette publique à la fin de l’année précédente, en % du PIB (Perspectives de l’économie mondiale du FMI).
- **écart de production** : de combien l’économie se situe au-dessus ou au-dessous de son niveau normal, selon l’estimation propre de l’application. Il retire l’effet des bonnes et des mauvaises années. Quand l’écart ne couvre pas assez d’années, l’application le laisse de côté et le signale.
- **rho** est le chiffre que vous reproduisez : de combien le solde primaire augmente, en points de PIB, pour chaque point de dette supplémentaire.

## Étapes

1. **Récupérez les données.** Dans l’application, ouvrez **Recherche**, choisissez le Brésil, puis **Historique et données**, puis le panneau **Réaction budgétaire**. Appuyez sur **Télécharger ces lignes (CSV)**. Le fichier `bohn-bra.csv` contient chaque année utilisée par l’application, les trois colonnes ci-dessus et la méthode déclarée par l’application (sources, années de l’échantillon, réglages). Quand l’application tourne, vous pouvez aussi le lire directement à `http://localhost:3000/api/bohn/BRA.csv`.
2. **Ouvrez un script de départ.** Choisissez `bohn_starter.R`, `bohn_starter.py` ou `bohn_starter.do`. Chacun charge le fichier, affiche les lignes et indique si l’écart de production est inclus. Aucun ne lance la régression : cette partie vous revient.
3. **Écrivez l’estimation.** Moindres carrés ordinaires avec constante, solde primaire sur la dette de l’année précédente (et l’écart de production quand il est inclus), avec toutes les lignes du fichier. Donnez le coefficient de la dette à trois décimales.
4. **Facultatif : écarts-types.** L’application utilise des écarts-types de Newey-West avec un retard floor(4 × (n/100)^(2/9)), au moins 1. Ils ne changent pas rho, seulement le degré de certitude à son sujet.
5. **Publiez votre script** là où chacun peut le lire (un dépôt ou un gist GitHub ; le lien commence par https://).
6. **Répondez** dans Menu > Quêtes : ouvrez la quête, puis Enregistrer en privé (sur cet ordinateur seulement) ou Préparer une réponse publique (une pull request sur GitHub). Donnez votre chiffre, le lien vers votre script et, si vous le souhaitez, une note : quelle édition des données vous avez utilisée et toute différence trouvée.

## Comment elle est tranchée

Après la fermeture des réponses, le responsable ouvre le même panneau avec les réglages indiqués par la quête et enregistre le chiffre affiché par l’application. Une réponse dans la marge de tolérance de la quête le reproduit. Une réponse différente n’est pas « fausse » : si ses notes montrent que l’application s’est trompée, le responsable l’enregistre, prépare une correction et cette réponse tranche la quête. Les réplications figurent sur les pages des participants et ne sont jamais classées.

## Points d’attention

- Le FMI révise son historique à chaque édition du WEO. Utilisez le fichier fourni par l’application et indiquez de quelle édition il s’agit (la colonne de la méthode la nomme).
- Les années que le FMI marque comme projections sont exclues ; seules les données observées sont utilisées.
- L’article de Bohn utilisait des données des États-Unis de 1916 à 1995 et des contrôles supplémentaires pour les dépenses de guerre. Cette quête reproduit la version du test de l’application sur les données FMI du Brésil, pas le tableau de l’article.

## Lectures

- Bohn, H. (1998), « The Behavior of U.S. Public Debt and Deficits », *Quarterly Journal of Economics* 113(3), 949-963.
- Mendoza, E. G. et Ostry, J. D. (2008), « International evidence on fiscal solvency: Is fiscal policy 'responsible'? », *Journal of Monetary Economics* 55(6), 1081-1093.
- Newey, W. K. et West, K. D. (1987), « A Simple, Positive Semi-Definite, Heteroskedasticity and Autocorrelation Consistent Covariance Matrix », *Econometrica* 55(3), 703-708.

Ce guide et les scripts de départ sont sous licence CC BY 4.0, comme le reste de `quests/`.
