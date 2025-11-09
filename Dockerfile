# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci --only=production=false --silent

# Copy source files
COPY . .

# Verify required files exist
RUN test -f public/index.html || (echo "ERROR: public/index.html not found" && exit 1)

# Set build environment variables
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV CI=true
ENV NODE_OPTIONS="--max_old_space_size=4096"

# Make build script executable and run it
RUN chmod +x build.sh
RUN ./build.sh

# Verify build output
RUN test -d build || (echo "ERROR: build directory not created" && exit 1)
RUN test -f build/index.html || (echo "ERROR: build/index.html not found" && exit 1)

# Install serve globally
RUN npm install -g serve@14.2.1

# Make startup script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 3000

# Use startup script
CMD ["./start.sh"]