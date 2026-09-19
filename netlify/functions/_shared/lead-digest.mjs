const FORM_NAME = 'sitesync-lead-digest';
const MAX_LEADS = 100;

function text(value, fallback = 'Not provided', limit = 5_000) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized.slice(0, limit) : fallback;
}

function formatTimestamp(value) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'Unknown time';
  return new Date(parsed).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/New_York'
  });
}

function formatLead(lead, index) {
  const platforms = Array.isArray(lead.platforms) && lead.platforms.length
    ? lead.platforms.map(platform => text(platform, '', 100)).filter(Boolean).join(', ')
    : 'Not selected';
  return [
    `${index + 1}. ${text(lead.business)} — ${text(lead.name)}`,
    `Submitted: ${formatTimestamp(lead.created_at)}`,
    `Email: ${text(lead.email)}`,
    `Phone: ${text(lead.phone)}`,
    `Website: ${text(lead.website)}`,
    `Package: ${text(lead.selected_package)}`,
    `Budget: ${text(lead.budget)}`,
    `Platforms: ${platforms}`,
    `Ongoing support: ${lead.extended_support ? 'Requested' : 'Not requested'}`,
    `Goals: ${text(lead.goals, 'Not provided', 5_000)}`
  ].join('\n');
}

export function buildDigest(leads, generatedAt = new Date()) {
  if (!Array.isArray(leads) || leads.length === 0 || leads.length > MAX_LEADS) throw new Error('invalid-lead-batch');
  const count = leads.length;
  const batchDate = generatedAt.toLocaleDateString('en-US', {
    dateStyle: 'long',
    timeZone: 'America/New_York'
  });
  return {
    count,
    batchDate,
    subject: `SiteSync lead digest — ${count} new lead${count === 1 ? '' : 's'}`,
    summary: leads.map(formatLead).join('\n\n' + '─'.repeat(48) + '\n\n')
  };
}

function databaseHeaders(publishableKey, formKey) {
  return {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
    'x-sitesync-form-key': formKey,
    'Content-Type': 'application/json'
  };
}

async function responseJson(response) {
  try { return await response.json(); } catch { return null; }
}

export function createLeadDigestRunner({ getEnv, fetchImpl = fetch, now = () => new Date() }) {
  return async function runLeadDigest() {
    const projectUrl = getEnv('SUPABASE_URL')?.replace(/\/$/, '');
    const publishableKey = getEnv('SUPABASE_PUBLISHABLE_KEY');
    const formKey = getEnv('SITESYNC_FORM_KEY');
    const publicSiteUrl = getEnv('PUBLIC_SITE_URL')?.replace(/\/$/, '');
    if (!projectUrl || !publishableKey || !formKey || !publicSiteUrl) throw new Error('digest-configuration-missing');

    const headers = databaseHeaders(publishableKey, formKey);
    const query = new URLSearchParams({
      select: 'id,created_at,name,business,email,phone,website,selected_package,budget,goals,platforms,extended_support',
      digest_sent_at: 'is.null',
      order: 'created_at.asc',
      limit: String(MAX_LEADS)
    });
    const readResponse = await fetchImpl(`${projectUrl}/rest/v1/consultation_requests?${query}`, { headers });
    const leads = await responseJson(readResponse);
    if (!readResponse.ok || !Array.isArray(leads)) throw new Error(`digest-read-${readResponse.status}`);
    if (leads.length === 0) return { status: 'empty', count: 0 };

    const digest = buildDigest(leads, now());
    const formBody = new URLSearchParams({
      'form-name': FORM_NAME,
      subject: digest.subject,
      batch_date: digest.batchDate,
      lead_count: String(digest.count),
      lead_summary: digest.summary
    });
    const formResponse = await fetchImpl(`${publicSiteUrl}/__forms.html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
      body: formBody.toString()
    });
    if (!formResponse.ok) throw new Error(`digest-form-${formResponse.status}`);

    const ids = leads.map(lead => lead.id).filter(Boolean);
    if (ids.length !== leads.length) throw new Error('digest-lead-id-missing');
    const updateQuery = new URLSearchParams({
      id: `in.(${ids.join(',')})`,
      digest_sent_at: 'is.null'
    });
    const updateResponse = await fetchImpl(`${projectUrl}/rest/v1/consultation_requests?${updateQuery}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ digest_sent_at: now().toISOString() })
    });
    if (!updateResponse.ok) throw new Error(`digest-update-${updateResponse.status}`);
    return { status: 'sent', count: digest.count };
  };
}
