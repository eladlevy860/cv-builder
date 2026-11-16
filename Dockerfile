# Production image with headless Chromium for server-side PDF export.
# The Playwright base image already contains Chromium and its system libraries.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    LANG=C.UTF-8 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    # The PDF route loads /render from this same container.
    PDF_RENDER_ORIGIN=http://127.0.0.1:3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build && npm prune --omit=dev && chown -R pwuser:pwuser /app

USER pwuser
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
