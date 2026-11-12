/**
 * Opening Menu > About & data licences from anywhere. Kept apart from AboutDialog.tsx so the
 * dialog itself loads only when it is first opened.
 */
export const OPEN_ABOUT_EVENT = 'econquest:open-about';

/** Opens Menu > About & data licences from any panel, optionally on one source's row. */
export function openDataLicences(id?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_ABOUT_EVENT, { detail: id ? { id } : undefined }));
}
