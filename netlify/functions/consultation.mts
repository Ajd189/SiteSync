import { json, parseBody, validateSubmission } from './_shared/consultation.mjs';
import type { Config, Context } from '@netlify/functions';

export default async (request: Request, _context: Context) => {
  if (request.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' }, { Allow: 'POST' });
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  const allowedOrigin = Netlify.env.get('PUBLIC_SITE_URL') || url.origin;
  if ((origin && origin !== allowedOrigin) || request.headers.get('sec-fetch-site') === 'cross-site') return json(403, { ok: false, error: 'Please submit this form from the SiteSync website.' });

  let raw;
  let lead;
  try {
    raw = await parseBody(request);
    if (typeof raw.company_fax === 'string' && raw.company_fax.trim()) return json(422, { ok: false, error: 'Please review your form and try again.' });
    lead = validateSubmission(raw);
  } catch {
    return json(422, { ok: false, error: 'Please check your name, business, email, and project details, then try again.' });
  }

  const projectUrl = Netlify.env.get('SUPABASE_URL');
  const publishableKey = Netlify.env.get('SUPABASE_PUBLISHABLE_KEY');
  const formKey = Netlify.env.get('SITESYNC_FORM_KEY');
  if (!projectUrl || !publishableKey || !formKey) {
    const missing = [!projectUrl && 'url', !publishableKey && 'publishable-key', !formKey && 'form-key'].filter(Boolean).join(',');
    return json(503, { ok: false, error: 'Consultation delivery is temporarily unavailable.' }, { 'X-SiteSync-Error': `configuration:${missing}` });
  }

  try {
    const response = await fetch(`${projectUrl.replace(/\/$/, '')}/rest/v1/consultation_requests`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        // Publishable keys identify the application; they are not user JWTs.
        'x-sitesync-form-key': formKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ ...lead, source: 'sitesync.us.com', user_agent: request.headers.get('user-agent')?.slice(0, 500) || null })
    });
    if (!response.ok) {
      console.error('consultation_storage_failed', response.status);
      return json(503, { ok: false, error: 'Consultation delivery is temporarily unavailable.' }, { 'X-SiteSync-Error': 'storage' });
    }
    return json(200, { ok: true });
  } catch {
    console.error('consultation_storage_unavailable');
    return json(503, { ok: false, error: 'Consultation delivery is temporarily unavailable.' }, { 'X-SiteSync-Error': 'storage-connection' });
  }
};
export const config: Config = { path: '/api/consultation' };
