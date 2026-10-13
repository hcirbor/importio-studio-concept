FROM node:22-alpine AS design-system
WORKDIR "/workspace/Import.io design system"
COPY ["Import.io design system/package.json", "Import.io design system/package-lock.json", "./"]
RUN npm ci
COPY ["Import.io design system/", "./"]
RUN npm run build

FROM node:22-alpine AS builder
WORKDIR "/workspace/Import Studio/studio-next"
COPY ["Import Studio/studio-next/package.json", "Import Studio/studio-next/package-lock.json", "./"]
COPY --from=design-system ["/workspace/Import.io design system", "/workspace/Import.io design system"]
RUN npm ci
COPY ["Import Studio/studio-next/", "./"]
ARG GITHUB_SHA=docker-build
ENV GITHUB_SHA=${GITHUB_SHA}
RUN npm run build:server

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
WORKDIR "/app/Import Studio/studio-next"
COPY --from=builder --chown=node:node ["/workspace/Import Studio/studio-next/.next/standalone/", "/app/"]
COPY --from=builder --chown=node:node ["/workspace/Import Studio/studio-next/public/", "/app/Import Studio/studio-next/public/"]
COPY --from=builder --chown=node:node ["/workspace/Import Studio/studio-next/.next/static/", "/app/Import Studio/studio-next/.next/static/"]
USER node
EXPOSE 8080
CMD ["node", "server.js"]
