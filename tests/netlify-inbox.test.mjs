import test from 'node:test';
import assert from 'node:assert/strict';
import { createInboxHandler } from '../netlify/functions/_shared/inbox.mjs';

const OWNER = 'owner@example.com';
const ID = '8de5ab92-3908-4e63-9b0b-4daf82976a63';
const environment = {
  SITESYNC_OWNER_EMAIL: OWNER,
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
  SITESYNC_FORM_KEY: 'private-form-key',
  PUBLIC_SITE_URL: 'https://sitesync.us.com'
};

function setup({ user = { id: 'owner-id', email: OWNER }, fetchImpl } = {}) {
  const calls = [];
  const request = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (fetchImpl) return fetchImpl(url, options);
    const table = String(url).match(/rest\/v1\/([^?]+)/)?.[1];
    const bodies = {
      sitesync_leads: [{ id: ID, business_name: 'Example prospect' }],
      consultation_requests: [{ id: ID, business: 'Example inquiry' }],
      sitesync_agent_runs: [{ id: ID, agent_name: 'Prospect Scout', status: 'success' }]
    };
    return Response.json(bodies[table] || []);
  };
  const handler = createInboxHandler({
    getUser: async () => user,
    getEnv: name => environment[name],
    fetchImpl: request,
    now: () => new Date('2026-09-19T20:00:00.000Z')
  });
  return { handler, calls };
}

test('requires an authenticated owner before database access', async () => {
  const signedOut = setup({ user: null });
  const signedOutResponse = await signedOut.handler(new Request('https://sitesync.us.com/api/inbox'));
  assert.equal(signedOutResponse.status, 401);
  assert.equal(signedOut.calls.length, 0);

  const wrongAccount = setup({ user: { id: 'other-id', email: 'other@example.com' } });
  const wrongAccountResponse = await wrongAccount.handler(new Request('https://sitesync.us.com/api/inbox'));
  assert.equal(wrongAccountResponse.status, 403);
  assert.equal(wrongAccount.calls.length, 0);
});

test('loads all private inbox collections with the server-held form key', async () => {
  const { handler, calls } = setup();
  const response = await handler(new Request('https://sitesync.us.com/api/inbox'));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(body.leads[0].business_name, 'Example prospect');
  assert.equal(body.consultations[0].business, 'Example inquiry');
  assert.equal(body.agentRuns[0].agent_name, 'Prospect Scout');
  assert.equal(calls.length, 3);
  assert.ok(calls.every(call => call.options.headers['x-sitesync-form-key'] === 'private-form-key'));
  assert.ok(calls.every(call => call.options.headers.apikey === 'publishable-test-key'));
  assert.doesNotMatch(JSON.stringify(body), /private-form-key|publishable-test-key/);
});

test('rejects cross-site and malformed updates', async () => {
  const { handler, calls } = setup();
  const crossSite = await handler(new Request('https://sitesync.us.com/api/inbox', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example', 'Sec-Fetch-Site': 'cross-site' },
    body: JSON.stringify({ kind: 'lead', id: ID, changes: { stage: 'Contacted' } })
  }));
  assert.equal(crossSite.status, 403);
  assert.equal(calls.length, 0);

  const malformed = await handler(new Request('https://sitesync.us.com/api/inbox', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Origin: 'https://sitesync.us.com' },
    body: JSON.stringify({ kind: 'lead', id: ID, changes: { stage: 'Send automatically' } })
  }));
  assert.equal(malformed.status, 422);
  assert.equal(calls.length, 0);
});

test('whitelists and normalizes an owner update', async () => {
  const { handler, calls } = setup({
    fetchImpl: async (_url, options) => Response.json([{ id: ID, stage: 'Contacted', updated_at: '2026-09-19T20:00:00.000Z' }])
  });
  const response = await handler(new Request('https://sitesync.us.com/api/inbox', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Origin: 'https://sitesync.us.com', 'Sec-Fetch-Site': 'same-origin' },
    body: JSON.stringify({
      kind: 'lead',
      id: ID,
      changes: {
        stage: 'Contacted',
        next_follow_up: '2026-09-22T14:30:00Z',
        notes: '  Called the front desk.  ',
        do_not_contact: false,
        business_name: 'Attempted overwrite'
      }
    })
  }));
  const body = await response.json();
  const sent = JSON.parse(calls[0].options.body);

  assert.equal(response.status, 200);
  assert.equal(body.record.stage, 'Contacted');
  assert.equal(calls[0].options.method, 'PATCH');
  assert.equal(sent.stage, 'Contacted');
  assert.equal(sent.next_follow_up, '2026-09-22T14:30:00.000Z');
  assert.equal(sent.notes, 'Called the front desk.');
  assert.equal(sent.updated_at, '2026-09-19T20:00:00.000Z');
  assert.equal('business_name' in sent, false);
});

test('allows only GET and PATCH', async () => {
  const { handler, calls } = setup();
  const response = await handler(new Request('https://sitesync.us.com/api/inbox', { method: 'DELETE' }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, PATCH');
  assert.equal(calls.length, 0);
});
