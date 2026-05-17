# Build stage - compile TypeScript
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript compilation)
RUN npm ci --include=dev

# Copy source files
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage - run the compiled app
FROM node:20-slim

# Install pdftk for XFA support and curl for healthcheck
RUN apt-get update && apt-get install -y \
    pdftk-java \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Environment defaults
ENV NODE_ENV=production
ENV BIND_HOST=127.0.0.1
ENV PORT=3001

# Health check (health endpoint is not protected by auth)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:3001/health || exit 1

# Run the service
# NOTE: PDF_SERVICE_API_KEY must be provided at runtime via docker run -e or docker-compose
CMD ["node", "dist/index.js"]
