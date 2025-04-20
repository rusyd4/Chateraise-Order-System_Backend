# Use official Node.js LTS image as base (non-alpine for better native module compatibility)
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source code
COPY . .

# Expose the port your app runs on (adjust if needed)
EXPOSE 5000

# Start the app
CMD ["npm", "start"]
