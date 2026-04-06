# ══════════════════════════════════════════════════════════════
# CONTAINER 2: CRON SCHEDULER
# Lightweight Alpine + curl-based cron
# Thay thế Vercel Cron khi self-host
# ══════════════════════════════════════════════════════════════

FROM alpine:3.21

RUN apk add --no-cache curl tzdata

# Set timezone Vietnam
ENV TZ=Asia/Ho_Chi_Minh

# Copy crontab + entrypoint
COPY crontab /etc/cron.d/blackstone-cron
COPY entrypoint.sh /entrypoint.sh

RUN chmod 0644 /etc/cron.d/blackstone-cron && \
    chmod +x /entrypoint.sh && \
    crontab /etc/cron.d/blackstone-cron

CMD ["/entrypoint.sh"]
