FROM node:20-alpine
WORKDIR /usr/src/app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies (production only)
WORKDIR /usr/src/app/backend
RUN npm install --production

# Copy backend and frontend source
WORKDIR /usr/src/app
COPY backend/ ./backend/
COPY frontend/ ./frontend/

EXPOSE 5000

# Start server
WORKDIR /usr/src/app/backend
CMD ["node", "server.js"]
