import React, { useEffect, useState } from 'react';
import { Link2, MessageSquare } from 'lucide-react';

/**
 * Comments and read-only links (CG10, src/server/routes/team.ts) under a policy review memo or a
 * saved report. Any signed-in account can comment; making a link needs an Analyst or Admin.
 */
type Comment = { id: string; by: string; at: string; text: string; done?: { by: string; at: string } };

export function TeamControl({ kind, id }: { kind: 'review' | 'report'; id: string }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [link, setLink] = useState<{ url: string; expires: string; note: string } | null>(null);
  const [days, setDays] = useState('14');
  useEffect(() => {
    if (!open || comments) return;
    fetch(`/api/comments?kind=${kind}&id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => setComments(j.comments))
      .catch((e) => setMsg(`Comments did not load (${e.message}).`));
  }, [open, comments, kind, id]);
  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  };
  const add = async () => {
    setMsg('');
    try {
      const j = await post('/api/comments', { kind, id, text });
      setComments(j.comments);
      setText('');
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  const done = async (cid: string) => {
    try {
      setComments((await post(`/api/comments/${encodeURIComponent(cid)}/done`, {})).comments);
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  const share = async () => {
    setMsg('');
    try {
      const j = await post('/api/shares', { kind, id, days: Number(days) });
      setLink({ url: `${window.location.origin}${j.path}`, expires: j.expires, note: j.note });
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  return (
    <div className="mt-2 text-xs" data-team-control={kind}>
      <button type="button" className="ui-pill inline-flex items-center gap-1" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <MessageSquare className="w-3 h-3" aria-hidden /> Comments and sharing{comments ? ` (${comments.filter((c) => !c.done).length} open)` : ''}
      </button>
      {open && (
        <div className="mt-2 space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
          {comments?.length === 0 && <p className="text-slate-500">No comments yet.</p>}
          <ul className="space-y-1">
            {comments?.map((c) => (
              <li key={c.id} className={c.done ? 'opacity-60' : ''}>
                <span className="font-semibold">{c.by}</span> <span className="text-slate-500">{c.at.slice(0, 16).replace('T', ' ')}</span>
                {c.done ? <span className="text-slate-500"> · done by {c.done.by}</span> : (
                  <button type="button" className="ml-2 underline" onClick={() => void done(c.id)}>
                    Mark done
                  </button>
                )}
                <p className="whitespace-pre-wrap">{c.text}</p>
              </li>
            ))}
          </ul>
          <label htmlFor={`team-c-${kind}-${id}`} className="sr-only">Add a comment</label>
          <textarea id={`team-c-${kind}-${id}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={4000} placeholder="Add a comment for your team" className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700" />
          <button type="button" className="ui-btn" disabled={!text.trim()} onClick={() => void add()}>
            Add comment
          </button>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label htmlFor={`team-d-${kind}-${id}`}>Read-only link for</label>
            <select id={`team-d-${kind}-${id}`} value={days} onChange={(e) => setDays(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700">
              {['1', '7', '14', '30', '90'].map((d) => (
                <option key={d} value={d}>
                  {d} day{d === '1' ? '' : 's'}
                </option>
              ))}
            </select>
            <button type="button" className="ui-pill inline-flex items-center gap-1" onClick={() => void share()}>
              <Link2 className="w-3 h-3" aria-hidden /> Make link
            </button>
          </div>
          {link && (
            <p>
              <input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} className="w-full px-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700" aria-label="Read-only link" />
              <span className="text-slate-500">
                Until {link.expires.slice(0, 10)}. {link.note}
              </span>
            </p>
          )}
          {msg && <p className="text-rose-600 dark:text-rose-400">{msg}</p>}
        </div>
      )}
    </div>
  );
}
