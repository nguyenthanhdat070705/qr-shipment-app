// Create the product-images bucket. Idempotent.
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.production.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m) {
    let v = m[2].replace(/\\r\\n$/g, '').replace(/\\n$/g, '').replace(/\\r$/g, '').trim();
    envVars[m[1]] = v;
  }
}

const supa = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = 'product-images';

const { data: buckets } = await supa.storage.listBuckets();
const existing = buckets.find(b => b.name === BUCKET);

if (existing) {
  console.log(`✓ Bucket "${BUCKET}" already exists (public: ${existing.public})`);
  if (!existing.public) {
    const { error } = await supa.storage.updateBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    });
    if (error) console.error('Update failed:', error);
    else console.log('✓ Made it public');
  }
} else {
  const { data, error } = await supa.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });
  if (error) {
    console.error('Create failed:', error);
    process.exit(1);
  }
  console.log(`✓ Created bucket "${BUCKET}"`, data);
}

// Verify with an upload+fetch round-trip
console.log('\nRound-trip test...');
// Minimal valid 1x1 PNG
const testBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=',
  'base64'
);
const testPath = `products/_smoke_${Date.now()}.png`;
const { error: upErr } = await supa.storage.from(BUCKET).upload(testPath, testBytes, {
  contentType: 'image/png',
  upsert: true,
});
if (upErr) { console.error('Upload failed:', upErr); process.exit(1); }

const { data: pub } = supa.storage.from(BUCKET).getPublicUrl(testPath);
const r = await fetch(pub.publicUrl);
console.log(`Upload OK. Fetch ${pub.publicUrl} → HTTP ${r.status}`);

// Clean up smoke file
await supa.storage.from(BUCKET).remove([testPath]);
console.log('Cleaned up smoke test file.');
console.log('\n✅ Bucket ready. Upload flow should work now.');
