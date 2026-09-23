FROM node:22-alpine as builder

COPY package.json package-lock.json tsconfig.json *.ts /source/

WORKDIR /source
RUN npm install && npx tsc

FROM node:22-alpine

COPY package.json package-lock.json /scripts/
COPY --from=builder /source/dist/. /scripts/

WORKDIR /scripts
RUN npm install --omit=dev

# Assume that NodeJS is set as the entrypoint in the base image.
CMD [ "/scripts/index.js" ]
