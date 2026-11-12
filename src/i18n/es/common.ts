import type { COMMON } from '../messages/common';

export const COMMON_ES: Partial<Record<keyof typeof COMMON.en, string>> = {
  showNumbers: 'Mostrar las cifras',
  loadingDesk: 'Cargando el escritorio…',
  panelFailed: 'No se pudo dibujar {name}. El resto de la app sigue funcionando.',
  tryAgain: 'Intentar de nuevo',
  appFailed: 'Algo falló al dibujar la app',
  appFailedBody: 'Sus datos guardados están a salvo. Recargue para intentarlo de nuevo. Si sigue pasando, el error de abajo ayuda a encontrar la causa.',
  reload: 'Recargar',
  badgeTitle: '{name}: {label}. {more} Haga clic para ver el registro.',
  stricterFail: 'Superada, no supera la comprobación más estricta',
};
