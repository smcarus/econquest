/**
 * The page's one ask of /api/update (src/server/updateCheck.ts), shared by the Menu and Menu > About
 * so the server is asked once per page load.
 */
import { useEffect, useState } from 'react';
import type { UpdateStatus } from '../utils/updateCheck';

let asked: Promise<UpdateStatus | null> | null = null;

export function loadUpdateStatus(): Promise<UpdateStatus | null> {
  if (!asked) {
    asked = fetch('/api/update')
      .then((r) => (r.ok ? (r.json() as Promise<UpdateStatus>) : null))
      .catch(() => null);
  }
  return asked;
}

export function useUpdateStatus(): UpdateStatus | null {
  const [s, setS] = useState<UpdateStatus | null>(null);
  useEffect(() => {
    let live = true;
    void loadUpdateStatus().then((v) => live && setS(v));
    return () => {
      live = false;
    };
  }, []);
  return s;
}
