import React, { useState } from 'react';
import { useT, useTx } from '../i18n/useLang';
import { MENU } from '../i18n/messages/menu';

/**
 * Menu > Settings > Research tools: "Test connection" opens a session with your research-tools
 * server (POST /api/research-tools/test) and lists the tools this token can see. Nothing is saved;
 * the test goes in the audit log like any other call. Loaded only when the page is opened.
 */
interface TestReply {
  ok: boolean;
  endpoint?: string;
  protocol?: string;
  tools?: Array<{ name: string; description: string }>;
  reason?: string;
}

const ResearchToolsTest: React.FC<{ canEdit: boolean }> = ({ canEdit }) => {
  const t = useT(MENU);
  const tx = useTx();
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<TestReply | null>(null);
  const run = async () => {
    setBusy(true);
    setReply(null);
    try {
      const r = await fetch('/api/research-tools/test', { method: 'POST' });
      const body = (await r.json().catch(() => ({}))) as TestReply & { error?: string };
      setReply(r.ok ? body : { ok: false, reason: body.error || body.reason || t('c_http', { status: r.status }) });
    } catch (e) {
      setReply({ ok: false, reason: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-4" data-research-tools-test="true">
      <button type="button" className="ui-btn ui-btn-primary" disabled={!canEdit || busy} onClick={() => void run()}>
        {busy ? t('rt_testing') : t('rt_test')}
      </button>
      {reply && !reply.ok && (
        <p className="mt-2 text-xs text-rose-700 dark:text-rose-400" role="alert" data-research-tools-result="failed">
          {tx(reply.reason || '')}
        </p>
      )}
      {reply?.ok && (
        <div className="mt-2 text-xs text-slate-700 dark:text-slate-300" role="status" data-research-tools-result="ok">
          <p>{reply.tools?.length ? t('rt_tools', { endpoint: reply.endpoint || '', n: reply.tools.length }) : t('rt_none')}</p>
          {!!reply.tools?.length && (
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              {reply.tools.map((tool) => (
                <li key={tool.name} data-research-tool={tool.name}>
                  <code className="font-mono">{tool.name}</code>
                  {tool.description ? <span className="text-slate-500 dark:text-slate-400">: {tool.description}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default ResearchToolsTest;
