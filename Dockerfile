# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY webapp/package*.json webapp/

# Install dependencies
RUN npm install
RUN cd webapp && npm install

# Copy source code
COPY . .

# Build web app
RUN cd webapp && npm run build

# Expose port
EXPOSE 3000

# Start command (will be overridden by Procfile)
CMD ["npm", "start"]
