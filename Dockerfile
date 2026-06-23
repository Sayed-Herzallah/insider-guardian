# Stage 1: Build the Vite + React frontend client application
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy dependency definition manifest and lockfile
COPY package*.json ./

# Install packages with strict audit compliance
RUN npm ci

# Copy source tree files
COPY . .

# Compile and package production bundles
RUN npm run build

# Stage 2: Serve compiled web client using Nginx server
FROM nginx:stable-alpine AS production-stage

# Copy production static assets to nginx default public directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to support Single Page Application (SPA) routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
