# syntax=docker/dockerfile:1.4

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Set build arguments and environment variables
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV \
    PATH=/app/node_modules/.bin:$PATH \
    CI=false

# Install dependencies for build
RUN apk add --no-cache python3 make g++ \
    && npm install -g npm@latest

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with caching
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --no-audit

# Copy source files
COPY --chown=node:node . .

# Build the application
RUN npm run build

# Development stage
FROM node:18-alpine AS development

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser

# Set environment variables
ENV NODE_ENV=development \
    WATCHPACK_POLLING=true \
    PATH=/app/node_modules/.bin:$PATH \
    CI=false

# Install development dependencies
COPY package*.json ./
COPY tsconfig.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy source code
COPY --chown=appuser:appgroup . .

# Set proper permissions
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget -q -O - http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start", "--", "--host", "0.0.0.0"]

# Production stage
FROM nginx:alpine AS production

# Install required tools
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder --chown=appuser:appgroup /app/build /usr/share/nginx/html

# Set proper permissions
RUN chown -R appuser:appgroup /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Switch to non-root user for nginx
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]



























































































































































































































































































































































































































































































































































































































COPY . .
RUN npm run build
EXPOSE 3000