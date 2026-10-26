FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    for attempt in 1 2 3; do \
      npm ci --prefer-offline --no-audit --no-fund \
        --fetch-retries=3 --fetch-retry-mintimeout=10000 \
        --fetch-retry-maxtimeout=30000 --fetch-timeout=120000 && exit 0; \
      if [ "$attempt" -eq 3 ]; then exit 1; fi; \
      echo "Dependency download failed; retrying npm ci ($attempt/3)..."; \
      sleep 10; \
    done
COPY . .
ARG INTERNAL_API_URL=http://api:4000
ENV INTERNAL_API_URL=$INTERNAL_API_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/data/media && chown -R node:node /app/data
USER node
CMD ["npm", "run", "start", "-w", "@jingo/api"]
