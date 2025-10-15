FROM node:22-alpine

COPY package.json package-lock.json index.js /scripts/

WORKDIR /scripts
RUN npm install
