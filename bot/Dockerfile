# Use Node.js LTS
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bot/package*.json ./bot/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm install

# Copy source code
COPY shared/ ./shared/
COPY bot/ ./bot/

# Build shared code
RUN npm run build:shared

# Set environment variables
ENV NODE_ENV=production

# Start the bot
CMD ["npm", "run", "start", "-w", "bot"]
