import { createLeadDigestRunner } from './_shared/lead-digest.mjs';
import { isNetlifyDigestEnabled } from './_shared/notification-mode.mjs';
import type { Config } from '@netlify/functions';

export default async () => {
  // Gmail owner notifications now own the queue. Do not mark unsent inquiries
  // as delivered through a second, unverified notification path.
  if (!isNetlifyDigestEnabled(Netlify.env.get('SITESYNC_NOTIFICATION_MODE'))) {
    return new Response(null, { status: 204 });
  }
  try {
    const runLeadDigest = createLeadDigestRunner({ getEnv: (name: string) => Netlify.env.get(name) });
    const result = await runLeadDigest();
    console.log('sitesync_lead_digest', result.status, result.count);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('sitesync_lead_digest_failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ ok: false }, { status: 500 });
  }
};
export const config: Config = { schedule: '0 13 * * *' };
