const LEAD_STAGES = new Set([
  'New',
  'Qualified',
  'Draft Ready',
  'Contacted',
  'Replied',
  'Consultation',
  'Proposal',
  'Won',
  'Lost',
  'Disqualified'
]);

const CONSULTATION_STATUSES = new Set(['new', 'contacted', 'qualified', 'closed']);
const PRIORITIES = new Set(['Unreviewed', 'Hot', 'Warm', 'Cold']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const QUERIES = {
  leads: {
    table: 'sitesync_leads',
    select: 'id,created_at,updated_at,business_name,contact_name,industry,location,website,email,phone,source,source_url,stage,lead_score,fit_score,need_signals,recommended_package,outreach_draft,follow_up_draft,last_contact,next_follow_up,notes,do_not_contact',
    limit: 250
  },
  consultations: {
    table: 'consultation_requests',
    select: 'id,created_at,name,business,email,phone,website,selected_package,budget,goals,platforms,extended_support,status,source,priority,response_draft,last_contact,next_follow_up,notes,agent_reviewed_at',
    limit: 250
  },
  agentRuns: {
    table: 'sitesync_agent_runs',
    select: 'id,created_at,agent_name,status,items_found,items_changed,summary,error',
    limit: 50
  }
};

function json(status, body, extra = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extra
    }
  });
}

function normalizeOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
}

function sameOrigin(request, configuredOrigin) {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const allowed = normalizeOrigin(configuredOrigin) || new URL(request.url).origin;
  return normalizeOrigin(origin) === allowed;
}

function textValue(value, limit) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > limit) throw new Error('invalid-text');
  return value.trim() || null;
}

function timestampValue(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 50) throw new Error('invalid-timestamp');
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error('invalid-timestamp');
  return new Date(timestamp).toISOString();
}

function changesFor(kind, value, now) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-changes');
  const changes = {};

  if (kind === 'lead') {
    if ('stage' in value) {
      if (!LEAD_STAGES.has(value.stage)) throw new Error('invalid-stage');
      changes.stage = value.stage;
    }
    if ('outreach_draft' in value) changes.outreach_draft = textValue(value.outreach_draft, 20_000);
    if ('follow_up_draft' in value) changes.follow_up_draft = textValue(value.follow_up_draft, 20_000);
    if ('notes' in value) changes.notes = textValue(value.notes, 20_000);
    if ('last_contact' in value) changes.last_contact = timestampValue(value.last_contact);
    if ('next_follow_up' in value) changes.next_follow_up = timestampValue(value.next_follow_up);
    if ('do_not_contact' in value) {
      if (typeof value.do_not_contact !== 'boolean') throw new Error('invalid-do-not-contact');
      changes.do_not_contact = value.do_not_contact;
    }
    changes.updated_at = now().toISOString();
  } else if (kind === 'consultation') {
    if ('status' in value) {
      if (!CONSULTATION_STATUSES.has(value.status)) throw new Error('invalid-status');
      changes.status = value.status;
    }
    if ('priority' in value) {
      if (!PRIORITIES.has(value.priority)) throw new Error('invalid-priority');
      changes.priority = value.priority;
    }
    if ('response_draft' in value) changes.response_draft = textValue(value.response_draft, 20_000);
    if ('notes' in value) changes.notes = textValue(value.notes, 20_000);
    if ('last_contact' in value) changes.last_contact = timestampValue(value.last_contact);
    if ('next_follow_up' in value) changes.next_follow_up = timestampValue(value.next_follow_up);
  } else {
    throw new Error('invalid-kind');
  }

  if (Object.keys(changes).length === (kind === 'lead' ? 1 : 0)) throw new Error('empty-changes');
  return changes;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function databaseHeaders(publishableKey, formKey) {
  return {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
    'x-sitesync-form-key': formKey,
    'Content-Type': 'application/json'
  };
}

async function readCollection(baseUrl, headers, fetchImpl, query) {
  const params = new URLSearchParams({
    select: query.select,
    order: 'created_at.desc',
    limit: String(query.limit)
  });
  const response = await fetchImpl(`${baseUrl}/rest/v1/${query.table}?${params}`, { headers });
  const body = await readJson(response);
  if (!response.ok || !Array.isArray(body)) throw new Error(`read-${query.table}-${response.status}`);
  return body;
}

async function updateRecord(baseUrl, headers, fetchImpl, kind, id, changes) {
  const query = kind === 'lead' ? QUERIES.leads : QUERIES.consultations;
  const params = new URLSearchParams({ id: `eq.${id}`, select: query.select });
  const response = await fetchImpl(`${baseUrl}/rest/v1/${query.table}?${params}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(changes)
  });
  const body = await readJson(response);
  if (!response.ok) throw new Error(`update-${query.table}-${response.status}`);
  if (!Array.isArray(body) || !body[0]) return null;
  return body[0];
}

export function createInboxHandler({ getUser, getEnv, fetchImpl = fetch, now = () => new Date() }) {
  return async function handleInbox(request) {
    if (!['GET', 'PATCH'].includes(request.method)) {
      return json(405, { ok: false, error: 'Method not allowed.' }, { Allow: 'GET, PATCH' });
    }

    const user = await getUser();
    if (!user) return json(401, { ok: false, error: 'Sign in to open the SiteSync inbox.' });

    const ownerEmail = getEnv('SITESYNC_OWNER_EMAIL')?.trim().toLowerCase();
    if (!ownerEmail) return json(503, { ok: false, error: 'Inbox access is not configured.' });
    if (!user.email || user.email.trim().toLowerCase() !== ownerEmail) {
      return json(403, { ok: false, error: 'This account is not authorized for the SiteSync inbox.' });
    }

    const projectUrl = getEnv('SUPABASE_URL')?.replace(/\/$/, '');
    const publishableKey = getEnv('SUPABASE_PUBLISHABLE_KEY');
    const formKey = getEnv('SITESYNC_FORM_KEY');
    if (!projectUrl || !publishableKey || !formKey) {
      return json(503, { ok: false, error: 'Inbox data access is temporarily unavailable.' });
    }

    const headers = databaseHeaders(publishableKey, formKey);
    if (request.method === 'GET') {
      try {
        const [leads, consultations, agentRuns] = await Promise.all([
          readCollection(projectUrl, headers, fetchImpl, QUERIES.leads),
          readCollection(projectUrl, headers, fetchImpl, QUERIES.consultations),
          readCollection(projectUrl, headers, fetchImpl, QUERIES.agentRuns)
        ]);
        return json(200, { ok: true, leads, consultations, agentRuns });
      } catch (error) {
        console.error('sitesync_inbox_read_failed', error instanceof Error ? error.message : 'unknown');
        return json(502, { ok: false, error: 'The inbox could not load its data.' });
      }
    }

    if (!sameOrigin(request, getEnv('PUBLIC_SITE_URL'))) {
      return json(403, { ok: false, error: 'This update must come from the SiteSync website.' });
    }

    let payload;
    let changes;
    try {
      if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('invalid-content-type');
      payload = await request.json();
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !UUID.test(payload.id || '')) throw new Error('invalid-payload');
      changes = changesFor(payload.kind, payload.changes, now);
    } catch {
      return json(422, { ok: false, error: 'Please review the inbox update and try again.' });
    }

    try {
      const record = await updateRecord(projectUrl, headers, fetchImpl, payload.kind, payload.id, changes);
      if (!record) return json(404, { ok: false, error: 'That inbox record no longer exists.' });
      return json(200, { ok: true, record });
    } catch (error) {
      console.error('sitesync_inbox_update_failed', error instanceof Error ? error.message : 'unknown');
      return json(502, { ok: false, error: 'The inbox update could not be saved.' });
    }
  };
}

