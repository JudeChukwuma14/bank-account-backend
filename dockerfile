# ─────────────────────────────────────────────────────────────
#   PRODUCTION-READY DOCKERFILE FOR YOUR EXPRESS APP
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine3.19 AS base

# Install dumb-init (helps with signal handling & zombie processes)
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files first (best layer caching)
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production && npm cache clean --force

# ─────────────────────────────────────────────────────────────
#   Development stage (only used when you build with --target dev)
# ─────────────────────────────────────────────────────────────
FROM base AS dev
RUN npm ci  # Install dev dependencies too (nodemon, etc.)
COPY . .
CMD ["npx", "nodemon", "server.js"]

# ─────────────────────────────────────────────────────────────
#   Production stage
# ─────────────────────────────────────────────────────────────
FROM base AS prod

# Copy source code
COPY . .

# Create non-root user (security best practice)
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 4000

# Use dumb-init + node (proper signal handling)
CMD ["dumb-init", "node", "server.js"]