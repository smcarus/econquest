/** Portuguese for src/i18n/messages/common.ts. Brazilian Portuguese, polite "você" (Sam, 2026-11-12). Not yet checked by a native speaker. */
import type { Messages } from '../lang';
import type { COMMON } from '../messages/common';

export const COMMON_PT: Messages<typeof COMMON> = {
  showNumbers: "Mostrar os números",
  loadingDesk: "Carregando a mesa…",
  panelFailed: "Não foi possível desenhar {name}. O resto do app continua funcionando.",
  tryAgain: "Tentar de novo",
  appFailed: "Algo deu errado ao desenhar o app",
  appFailedBody: "Seus dados salvos estão seguros. Recarregue para tentar de novo. Se continuar acontecendo, o erro abaixo ajuda a encontrar a causa.",
  reload: "Recarregar",
  badgeTitle: "{name}: {label}. {more} Clique para ver o registro.",
  stricterFail: "Aprovado, falha na verificação mais rigorosa",
};
