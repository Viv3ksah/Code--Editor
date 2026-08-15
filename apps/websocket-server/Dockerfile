FROM node:20-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-workspaces || npm install --omit=dev
COPY . .
RUN npm install -D tsx --no-workspaces || true

ENV PORT=5000
EXPOSE 5000
CMD ["npx", "tsx", "src/index.ts"]
