#!/bin/bash

# Exit on any error
set -e

# 1. Remove old build
echo "Cleaning old build..."
rm -rf dist

# 2. Build production
echo "Building project..."
npm run build

# 3. Deploy to server
echo "Deploying to DreamHost..."
rsync -avz --delete dist/ evanrothcom@vps50136.dreamhostps.com:~/screen-sampler.evan-roth.com/app/

echo "Deployment complete! Visit: https://screen-sampler.evan-roth.com/app/"