/**
 * Counts the bytes the app downloads, so the daily run can say how much each step fetched
 * (`npm run go -- status`) instead of the docs giving an estimate.
 *
 * It wraps fetch. For each reply from another computer (not this one: 127.0.0.1, localhost and ::1
 * are left out), the body is counted as it is read. When the reply was sent compressed and says
 * its size (Content-Encoding and Content-Length), that size is counted, because it is what crossed
 * the network; otherwise the bytes read are counted. A body that is never read is not counted.
 * Server-only (Node): the browser build never imports it.
 */

export interface DownloadCounter {
  /** Bytes counted since the counter was installed. */
  total(): number;
  /** Puts the original fetch back. */
  uninstall(): void;
}

type FetchFn = typeof fetch;

export function isLocalUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^\[|\]$/g, '');
    return h === 'localhost' || h === '::1' || h === '0.0.0.0' || /^127\./.test(h);
  } catch {
    return false;
  }
}

function urlOf(input: Parameters<FetchFn>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url;
}

/** Wraps one reply so its body is counted as it is read; calls add() once with the byte count. */
export function countedResponse(res: Response, add: (bytes: number) => void): Response {
  if (!res.body) return res;
  const wire = Number(res.headers.get('content-length'));
  const compressed = !!res.headers.get('content-encoding') && Number.isFinite(wire) && wire > 0;
  let read = 0;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    add(compressed ? wire : read);
  };
  const counted = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) {
        read += chunk.byteLength;
        ctl.enqueue(chunk);
      },
      flush() {
        finish();
      },
    }),
  );
  const out = new Response(counted, { status: res.status, statusText: res.statusText, headers: res.headers });
  // Keep what callers read from the original reply.
  Object.defineProperty(out, 'url', { value: res.url });
  Object.defineProperty(out, 'redirected', { value: res.redirected });
  return out;
}

/** Installs the counter on globalThis.fetch (or the given holder, for tests). */
export function installDownloadCounter(holder: { fetch: FetchFn } = globalThis as unknown as { fetch: FetchFn }): DownloadCounter {
  const original = holder.fetch;
  let bytes = 0;
  const wrapped: FetchFn = async (input, init) => {
    const res = await original(input as any, init);
    if (isLocalUrl(urlOf(input))) return res;
    return countedResponse(res, (n) => {
      bytes += n;
    });
  };
  holder.fetch = wrapped;
  return {
    total: () => bytes,
    uninstall: () => {
      if (holder.fetch === wrapped) holder.fetch = original;
    },
  };
}
