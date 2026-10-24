FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# The post-install patch needs both the script and the vendored 26.2 data.
COPY package.json package-lock.json ./
COPY scripts ./scripts
COPY vendor ./vendor
RUN npm ci --omit=dev

COPY bot.js ./

USER node
CMD ["node", "bot.js"]
