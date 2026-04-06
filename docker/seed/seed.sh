#!/bin/sh
# ══════════════════════════════════════════════════════════════
# DATA SEED SCRIPT
# Chạy tuần tự các bước khởi tạo dữ liệu cho server mới
# ══════════════════════════════════════════════════════════════

echo "╔══════════════════════════════════════════════════╗"
echo "║  BlackStone Data Seeder                          ║"
echo "║  Importing initial data...                       ║"
echo "╚══════════════════════════════════════════════════╝"

# ── Step 1: Upload NCC (Suppliers) ────────────────────────────
echo ""
echo "▶ [1/4] Uploading dim_ncc (suppliers)..."
if [ -f /app/data/ncc.csv ]; then
  node scripts/upload_ncc.mjs
  echo "  ✅ Suppliers imported"
else
  echo "  ⏭ Skipped — /app/data/ncc.csv not found"
fi

# ── Step 2: Upload Inventory ──────────────────────────────────
echo ""
echo "▶ [2/4] Uploading fact_inventory..."
if [ -f /app/data/inventory.csv ]; then
  node scripts/upload_inventory.mjs
  echo "  ✅ Inventory imported"
else
  echo "  ⏭ Skipped — /app/data/inventory.csv not found"
fi

# ── Step 3: Sync Inventory from Google Sheets ─────────────────
echo ""
echo "▶ [3/4] Syncing inventory from Google Sheets..."
curl -sf -X POST "${APP_URL}/api/sync-inventory" && \
  echo "  ✅ Google Sheets sync completed" || \
  echo "  ⚠️ Google Sheets sync failed (app may not be ready)"

# ── Step 4: Match NCC ↔ Hom ──────────────────────────────────
echo ""
echo "▶ [4/4] Matching NCC to dim_hom..."
node scripts/match_ncc_hom.mjs 2>/dev/null && \
  echo "  ✅ NCC-Hom matching completed" || \
  echo "  ⏭ Skipped"

echo ""
echo "══════════════════════════════════════════════════"
echo "✅ Data seed completed!"
echo "══════════════════════════════════════════════════"
