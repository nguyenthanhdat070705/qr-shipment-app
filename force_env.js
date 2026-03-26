const { execSync } = require('child_process');

const envs = {
  NEXT_PUBLIC_SUPABASE_URL: "https://zspazvdyrrkdosqigomk.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjIwOTcsImV4cCI6MjA4OTM5ODA5N30.fwJGPh46Hqd8ekKMJ-6nb9uyd1raerKmc1n4qXHEIrM",
  SUPABASE_SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY",
  ONEOFFICE_API_KEY: "84869196569c35038d0514699999665",
  ONEOFFICE_BASE_URL: "https://cloud-cloud.1office.vn",
  ONEOFFICE_INVENTORY_TOKEN: "201770191369c4adde97a6d512470927",
  ONEOFFICE_WAREHOUSE_TOKEN: "21629249469c4ae9a40117149012318",
  CRON_SECRET: "blackstone-cron-secret-2026"
};

for (const [k, v] of Object.entries(envs)) {
  console.log(`Setting ${k}...`);
  try {
    execSync(`npx vercel env rm ${k} production -y`, { stdio: 'ignore' });
  } catch (e) {}
  try {
    execSync(`npx vercel env add ${k} production`, { input: v, stdio: ['pipe', 'inherit', 'inherit'] });
  } catch (e) {
    console.error(`Failed on ${k}: ${e.message}`);
  }
}
console.log("Done uploading envs!");
