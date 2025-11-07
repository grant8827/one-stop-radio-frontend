# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy all source files (respecting .dockerignore)
COPY . .

# Verify required files exist
RUN ls -la public/
RUN test -f public/index.html || (echo "ERROR: public/index.html not found" && exit 1)

# Build the app
RUN npm run build

# Install serve globally to serve the static build
RUN npm install -g serve

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "build", "-l", "3000"]