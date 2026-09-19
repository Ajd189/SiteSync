import { getUser } from '@netlify/identity';
import type { Config, Context } from '@netlify/functions';
import { createInboxHandler } from './_shared/inbox.mjs';

const handleInbox = createInboxHandler({
  getUser,
  getEnv: (name: string) => Netlify.env.get(name),
  fetchImpl: fetch
});

export default async (request: Request, _context: Context) => handleInbox(request);

export const config: Config = { path: '/api/inbox' };
