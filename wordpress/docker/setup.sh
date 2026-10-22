#!/bin/bash
# First-time setup inside the cli container: WordPress, Polylang, the theme, both languages of content.
set -e
cd /var/www/html
URL=${SITE_URL:-http://localhost:8080}
if ! wp core is-installed 2>/dev/null; then
  wp core install --url="$URL" --title="Apex Surgery Hospital" --admin_user=apex-admin \
    --admin_email=${ADMIN_EMAIL:-admin@example.com} --skip-email
  echo "Admin password above. Change it after the first login."
fi
wp plugin install polylang --activate
wp theme activate apex-surgery
wp apex import
wp apex check
wp rewrite flush
echo "Done: $URL"
