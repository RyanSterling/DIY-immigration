FROM node:20-slim

# Install pdftk-java (requires Java runtime)
RUN apt-get update && \
    apt-get install -y --no-install-recommends pdftk-java && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the service
CMD ["node", "index.js"]
