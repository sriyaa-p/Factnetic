# Use the official Node.js Alpine base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install production-only dependencies
RUN npm ci --only=production

# Copy remaining source code
COPY . .

# Expose the application port
EXPOSE 3000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD [ "node", "server.js" ]
