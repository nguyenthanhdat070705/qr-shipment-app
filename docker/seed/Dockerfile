# ══════════════════════════════════════════════════════════════
# CONTAINER 3: DATA SEED / MIGRATION
# Chạy 1 lần để import dữ liệu CSV + khởi tạo DB
# Dùng khi deploy server mới
# ══════════════════════════════════════════════════════════════

FROM node:22-alpine

WORKDIR /app

# Install dependencies for scripts
RUN npm init -y && npm install @supabase/supabase-js dotenv csv-parse

# Copy seed scripts and SQL
COPY scripts/ ./scripts/
COPY sql/ ./sql/
COPY docker/seed/seed.sh ./seed.sh

RUN chmod +x ./seed.sh

ENV TZ=Asia/Ho_Chi_Minh

CMD ["./seed.sh"]
