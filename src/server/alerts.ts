/**
 * Server alerts, the server side (src/utils/serverAlerts.ts does the sending): the Test button in
 * Menu > Settings > Server alerts. Settings come from process.env, where keys saved in Settings
 * are applied over .env (src/utils/userSettings.ts), so a value in either place works.
 */
import { API_KEY_FIELDS, type ApiKeyField } from '../data/apiKeyFields';
import type { ConnectionResult } from '../utils/connectionCheck';
import { alertSettingsFrom, secretsIn, sendAlert, TEST_ALERT, type AlertSettings, type SendDeps } from '../utils/serverAlerts';

/** Settings that are secret (keys, the webhook address, the mail server with its password). */
const SECRET_IDS = API_KEY_FIELDS.filter((f) => f.secret !== false).map((f) => f.id);

/** Every secret value in this environment, to blank in any message. */
export const alertSecrets = (env: Record<string, string | undefined>) => secretsIn(env, SECRET_IDS, alertSettingsFrom(env));

/**
 * The Test button for a Server alerts setting: sends a real test message on that route (the
 * webhook, or email with the three email settings), with the typed value in place of the saved
 * one. Answers in the shape of a connection check row so Settings shows it like any other test.
 */
export async function testAlertRoute(field: ApiKeyField, value: string, env: Record<string, string | undefined>, deps: SendDeps = {}): Promise<ConnectionResult> {
  const withValue = value ? { ...env, [field.id]: value } : env;
  const all = alertSettingsFrom(withValue);
  const webhook = field.id === 'ALERT_WEBHOOK_URL';
  const route: AlertSettings = webhook ? { webhookUrl: all.webhookUrl } : { smtpUrl: all.smtpUrl, emailTo: all.emailTo, emailFrom: all.emailFrom };
  const base = { id: field.checkId, name: field.label, group: 'free' as const, feeds: field.feeds, host: '' };
  if (webhook ? !route.webhookUrl : !route.smtpUrl && !route.emailTo) {
    return { ...base, state: 'needs_setup', detail: webhook ? 'Type a webhook address first.' : 'Set the mail server and the address to send to first.' };
  }
  const [r] = await sendAlert(TEST_ALERT, route, { ...deps, secrets: alertSecrets(withValue) });
  if (!r) return { ...base, state: 'needs_setup', detail: 'Nothing to send to.' };
  return r.ok ? { ...base, state: 'connected', detail: r.detail, sample: `Test ${webhook ? 'message' : 'email'} sent: ${r.detail}` } : { ...base, state: /could not be reached|did not answer/.test(r.detail) ? 'no_answer' : r.detail.startsWith('Not sent') ? 'needs_setup' : 'refused', detail: r.detail };
}
