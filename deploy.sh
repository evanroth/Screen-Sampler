#!/bin/bash
set -e

APP_DIST="dist"
DEPLOY_DIR="~/screen-sampler.evan-roth.com/app"

echo "Cleaning old build..."
rm -rf $APP_DIST

echo "Building project..."
npm run build

# Ensure .htaccess exists for SPA routing
HTACCESS_CONTENT='RewriteEngine On
RewriteBase /app/

# Serve existing files normally
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Redirect all other requests to index.html
RewriteRule ^ index.html [L]'

echo "$HTACCESS_CONTENT" > $APP_DIST/.htaccess
echo ".htaccess created for SPA routing"

# Deploy to server
echo "Deploying to DreamHost..."
rsync -avz --delete $APP_DIST/ evanrothcom@vps50136.dreamhostps.com:$DEPLOY_DIR/

echo "✅ Deployment complete! Visit: https://screen-sampler.evan-roth.com/app/"