FROM node:22-alpine

COPY package.json package-lock.json index.js /scripts/

WORKDIR /scripts
RUN npm install

# Assume that NodeJS is set as the entrypoint in the base image.
CMD [ "/scripts/index.js" ]
