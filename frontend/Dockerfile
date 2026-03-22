# YASH EstPro Frontend Dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files (lockfile has npmjs.org URLs)
COPY package.json yarn.lock ./

# Install dependencies with extended timeout and retries
RUN yarn config set registry https://registry.npmjs.org && \
    yarn config set network-timeout 600000 && \
    (yarn install --frozen-lockfile --network-concurrency 1 || (sleep 5 && yarn install --frozen-lockfile --network-concurrency 1))

# Copy source code
COPY . .

# Build argument for API URL
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Build the application
RUN yarn build

# Stage 2: Production
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
