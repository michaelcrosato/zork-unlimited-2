# Dockerfile for AdventureForge Autonomous Agent Execution Sandbox
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency configs
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Install dependencies
RUN pnpm install

# Copy project source
COPY . .

# Run compilation
RUN pnpm build

# Default command starts the developer loop
CMD ["pnpm", "dev-loop"]
