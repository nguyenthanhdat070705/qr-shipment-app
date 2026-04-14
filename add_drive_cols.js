require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function main() {
  try {
    await pool.query(`
      ALTER TABLE public.members 
      ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
      ADD COLUMN IF NOT EXISTS drive_folder_link TEXT;
    `);
    console.log("Cols added to members table successfully.");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

main();
