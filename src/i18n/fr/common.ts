/** French for src/i18n/messages/common.ts. Formal "vous" throughout. Not yet checked by a native speaker. */
import type { Messages } from '../lang';
import type { COMMON } from '../messages/common';

export const COMMON_FR: Messages<typeof COMMON> = {
  showNumbers: 'Afficher les chiffres',
  loadingDesk: 'Chargement du bureau…',
  panelFailed: "{name} n'a pas pu être affiché. Le reste de l'application fonctionne toujours.",
  tryAgain: 'Réessayer',
  appFailed: "Un problème est survenu lors de l'affichage de l'application",
  appFailedBody: "Vos données enregistrées sont en sécurité. Rechargez pour réessayer. Si cela se reproduit, l'erreur ci-dessous aide à en trouver la cause.",
  reload: 'Recharger',
  badgeTitle: '{name} : {label}. {more} Cliquez pour voir le registre.',
  stricterFail: 'Réussi, échoue au contrôle plus strict',
};
