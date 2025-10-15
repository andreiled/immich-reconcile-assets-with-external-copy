# !/bin/sh
docker run \
    --entrypoint /usr/local/bin/npm \
    --workdir /scripts \
    --mount 'type=bind,source=./package.json,target=/scripts/package.json' \
    --mount 'type=bind,source=./package-lock.json,target=/scripts/package-lock.json' \
    node:22-alpine \
    "$@"
