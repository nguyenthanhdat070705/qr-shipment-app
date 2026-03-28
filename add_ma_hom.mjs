import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres.zspazvdyrrkdosqigomk:Nguyenthanhdat0707@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');

    // 1. Add column if not exists
    await client.query('ALTER TABLE public.fact_dam ADD COLUMN IF NOT EXISTS ma_hom text;');
    console.log('Column ma_hom checked/added.');

    // 2. We need to update ma_hom in fact_dam based on hom_loai matching dim_hom.ten_hom
    // Fetch dim_hom to build a map
    const { rows: dimHomRows } = await client.query('SELECT ma_hom, ten_hom FROM public.dim_hom;');
    console.log(`Fetched ${dimHomRows.length} rows from dim_hom.`);

    const { rows: factDamRows } = await client.query('SELECT id, hom_loai FROM public.fact_dam WHERE hom_loai IS NOT NULL;');
    console.log(`Found ${factDamRows.length} rows in fact_dam with hom_loai.`);

    // Build the update query efficiently using individual statements or a case statement, 
    // but individual statements for 177 is fast enough.
    let updateCount = 0;
    for (const fact of factDamRows) {
        // match dim_hom by ten_hom
        const matchingDim = dimHomRows.find(d => d.ten_hom === fact.hom_loai);
        if (matchingDim) {
            await client.query('UPDATE public.fact_dam SET ma_hom = $1 WHERE id = $2', [matchingDim.ma_hom, fact.id]);
            updateCount++;
        }
    }

    console.log(`Successfully updated ${updateCount} rows in fact_dam with ma_hom.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
