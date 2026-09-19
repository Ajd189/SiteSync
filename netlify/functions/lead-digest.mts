import { createLeadDigestRunner } from './_shared/lead-digest.mjs';
import type { Config } from '@netlify/functions';

const runLeadDigest = createLeadDigestRunner({
  getEnv: (name: string) => Netlify.env.get(name)
});

export default async () => {
  try {
    const result = await runLeadDigest();
    console.log('sitesync_lead_digest', result.status, result.count);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('sitesync_lead_digest_failed', error instanceof Error ? error.message : 'unknown');
    return Response.json({ ok: false }, { status: 500 });
  }
};

export const config: Config = {
  schedule: '0 13 * * *'
};
