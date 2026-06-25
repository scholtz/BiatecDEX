FROM node:24 AS build
WORKDIR /src
RUN apt update \
  && apt dist-upgrade -y \
  && apt-get clean autoclean \
  && apt-get autoremove --yes \
  && rm -rf /var/lib/{apt,dpkg,cache,log}/ \
  && npm install -g npm@latest \
  && npm install -g vite@latest
COPY package-lock.json package-lock.json
COPY package.json package.json
RUN npm ci
# Install Playwright's Chromium browser + OS-level dependencies for screenshot generation
RUN npx playwright install chromium --with-deps
COPY . .
# Generate fresh localised help text from help-bodies.mjs into all 10 locale JSON files
RUN node scripts/generate-help-locales.mjs
# Start the Vite dev server on :5173, capture per-locale screenshots, then stop it.
# The screenshots are written to public/help-screenshots/ and bundled by the
# subsequent `vite build` step so they are served as static assets.
RUN vite & \
    VITE_PID=$! && \
    echo "Waiting for Vite dev server on :5173 ..." && \
    timeout 120 sh -c 'until curl -sf http://localhost:5173 > /dev/null 2>&1; do sleep 2; done' && \
    echo "Dev server ready — generating help screenshots..." && \
    PLAYWRIGHT_BASE_URL=http://localhost:5173 SETTLE_MS=6000 node scripts/generate-help-screenshots.mjs ; \
    SHOT_EXIT=$? ; \
    kill $VITE_PID 2>/dev/null || true ; \
    wait $VITE_PID 2>/dev/null || true ; \
    exit $SHOT_EXIT
RUN npm run build
RUN cd /src/dist && ls

FROM nginxinc/nginx-unprivileged:latest
USER root
ENV DEBIAN_FRONTEND=noninteractive
RUN apt update && apt dist-upgrade -y && apt install -y bc mc wget telnet git curl iotop atop vim && apt-get clean autoclean && apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/
RUN mkdir /app
COPY docker/default.conf /etc/nginx/conf.d/default.conf
RUN chown nginx:nginx /etc/nginx/conf.d -R
RUN chmod 0600 /etc/nginx/conf.d -R
RUN chmod 0700 /etc/nginx/conf.d
USER nginx
WORKDIR /app
COPY --from=build /src/dist .
RUN pwd && ls
