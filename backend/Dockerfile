# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Final image
FROM node:18-alpine
WORKDIR /app

# Security: non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY package.json ./

# Set ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

EXPOSE 3000
CMD ["node", "src/index.js"]
