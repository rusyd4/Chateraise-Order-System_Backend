# Use official Node.js Alpine image
FROM node:18-alpine

ARG PORT
ARG DATABASE_URL
ARG JWT_SECRET
ARG SMTP_PORT
ARG SMTP_HOST
ARG SMTP_USER
ARG SMTP_PASS=

ENV PORT=$PORT
ENV DATABASE_URL=$DATABASE_URL
ENV JWT_SECRET=$JWT_SECRET
ENV SMTP_PORT=$SMTP_PORT
ENV SMTP_HOST=$SMTP_HOST
ENV SMTP_USER=$SMTP_USER
ENV SMTP_PASS=$SMTP_PASS

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
