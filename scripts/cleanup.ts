import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
if (existsSync('apps/web/.env.local')) loadEnvFile('apps/web/.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase service configuration required.');
const db = createClient(url, key, { auth: { persistSession: false } });
let removed = 0;
// Include unknown/deleted workspace prefixes by walking Storage itself.
for (let offset = 0; ; offset += 100) {
  const folders = await db.storage.from('screenshots').list('', { limit: 100, offset });
  if (folders.error) throw folders.error;
  if (!folders.data.length) break;
  for (const folder of folders.data) {
    const stale: string[] = [];
    for (let page = 0; ; page += 100) {
      const files = await db.storage
        .from('screenshots')
        .list(folder.name, { limit: 100, offset: page });
      if (files.error) throw files.error;
      if (!files.data.length) break;
      for (const file of files.data) {
        if (
          !file.id ||
          !file.created_at ||
          Date.now() - new Date(file.created_at).getTime() < 86400000
        )
          continue;
        const path = folder.name + '/' + file.name;
        const attached = await db
          .from('report_attachments')
          .select('id')
          .eq('object_path', path)
          .maybeSingle();
        if (attached.error) throw attached.error;
        if (!attached.data) stale.push(path);
      }
    }
    if (stale.length) {
      const result = await db.storage.from('screenshots').remove(stale);
      if (result.error) throw result.error;
      removed += stale.length;
    }
  }
}
const expired = await db
  .from('ingestion_limits')
  .delete()
  .lt('window_start', new Date(Date.now() - 172800000).toISOString());
if (expired.error) throw expired.error;
console.log(
  `Removed ${removed} unreferenced screenshots older than 24 hours; pruned expired rate windows.`,
);
