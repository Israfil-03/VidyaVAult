# Multi-stage build for VidyaVault

# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run prisma:generate -w server

# Build client and server
RUN npm run build -w client
RUN npm run build -w server

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY server/prisma ./server/prisma/

# Install production dependencies only
RUN npm ci --omit=dev && npm install -g prisma

# Copy built artifacts from builder
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run server
ENTRYPOINT ["/sbin/dumb-init", "--"]
CMD ["node", "server/dist/server.js"]
