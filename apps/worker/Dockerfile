FROM node:20-bookworm

# Language runtimes for native code execution (no Docker-in-Docker)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    g++ \
    openjdk-17-jdk-headless \
    golang-go \
    curl \
    build-essential \
    && curl https://sh.rustup.rs -sSf | sh -s -- -y \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.cargo/bin:${PATH}"
ENV USE_DOCKER=false
ENV WORKER_PROCS=1

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-workspaces || npm install --omit=dev
COPY . .
RUN npm install -D tsx --no-workspaces || true

CMD ["npx", "tsx", "src/index.ts"]
