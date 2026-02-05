

## Add .htaccess File for CORS and SPA Routing

### Overview
Add an `.htaccess` file to the `public` directory that will be included in the build output. This file configures Apache to:
1. Enable SPA (Single Page Application) routing by redirecting all requests to `index.html`
2. Set CORS headers to allow external resources to be loaded from any origin

### Implementation

**Create `public/.htaccess`**

```apache
RewriteEngine On

RewriteBase /

# Serve existing files normally
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# All other requests go to index.html
RewriteRule ^ index.html [L]

<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
</IfModule>
```

### Technical Notes
- Files in the `public` directory are copied as-is to the `dist` folder during build
- This will replace the dynamically generated `.htaccess` in your `deploy.sh` script, so you may want to remove that section from the deploy script after this change
- The `mod_headers` module must be enabled on your Apache server for the CORS header to work

