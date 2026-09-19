import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDigest, createLeadDigestRunner } from '../netlify/functions/_shared/lead-digest.mjs';

const lead = {
  id: 'd9422d44-7e69-40d4-9f7b-e8cb7dd5031b',
  created_at: '2026-09-19T12:00:00.000Z',
  name: 'Jamie Smith',
  business: 'North Star Studio',
  email: 'jamie@example.com',
  phone: '555-0100',
  website: 'https://example.com',
  selected_package: 'Connected Launch — $500',
  budget: '$500–$1,000',
  goals: 'Connect the website, analytics, and customer inquiry flow.',
  platforms: ['Google', 'Instagram'],
  extended_support: true
};

const env = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
  SITESYNC_FORM_KEY: 'private-test-key',
  PUBLIC_SITE_URL: 'https://sitesync.us.com'
};

test('formats one concise owner digest from new consultations', () => {
  const digest = buildDigest([lead], new Date('2026-09-19T13:00:00.000Z'));
  assert.equal(digest.count, 1);
  assert.equal(digest.subject, 'SiteSync lead digest — 1 new lead');
  assert.match(digest.summary, /North Star Studio — Jamie Smith/);
  assert.match(digest.summary, /Google, Instagram/);
});

test('does nothing when there are no undigested consultations', async () => {
  const calls = [];
  const runner = createLeadDigestRunner({
    getEnv: name => env[name],
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json([]);
    }
  });
  assert.deepEqual(await runner(), { status: 'empty', count: 0 });
  assert.equal(calls.length, 1);
});

test('posts one Netlify form batch and marks only those consultations as sent', async () => {
  const calls = [];
  const runner = createLeadDigestRunner({
    getEnv: name => env[name],
    now: () => new Date('2026-09-19T13:00:00.000Z'),
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (!options.method) return Response.json([lead]);
      if (url.endsWith('/__forms.html')) return new Response('', { status: 200 });
      if (options.method === 'PATCH') return new Response(null, { status: 204 });
      return new Response('', { status: 500 });
    }
  });
  assert.deepEqual(await runner(), { status: 'sent', count: 1 });
  assert.equal(calls.length, 3);
  const form = new URLSearchParams(calls[1].options.body);
  assert.equal(form.get('form-name'), 'sitesync-lead-digest');
  assert.equal(form.get('lead_count'), '1');
  assert.match(form.get('lead_summary'), /jamie@example\.com/);
  assert.match(calls[2].url, /digest_sent_at=is\.null/);
  assert.deepEqual(JSON.parse(calls[2].options.body), { digest_sent_at: '2026-09-19T13:00:00.000Z' });
});
