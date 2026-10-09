#!/bin/bash
# Builds the jestlearn Svelte app (Vite) and publishes the result to ./howtocode
# (served by server.js / Caddy as the "how to code" course).

git submodule update --init --recursive
cd jestlearn
git pull
npm ci
npm run build
cp -r ./dist ../
cd ../
rm -rf howtocode
mv dist howtocode
