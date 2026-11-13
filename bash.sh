#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

REMOTE_HOST="${REMOTE_HOST:-root@35.212.204.214}"

npm run build

rm -f dist.zip
zip -r dist.zip dist/*
scp dist.zip "${REMOTE_HOST}:/root/"

ssh "${REMOTE_HOST}" << 'EOF'
set -euo pipefail
cd /root/
rm -rf /root/dist
unzip -o /root/dist.zip -d /root/
mkdir -p /usr/share/nginx/html1 /var/www/html
rm -rf /usr/share/nginx/html1/*
cp -r /root/dist /usr/share/nginx/html1/
rm -rf /var/www/html/*
cp -r /root/dist/* /var/www/html/
rm -rf /root/dist /root/dist.zip
nginx -t
systemctl reload nginx
EOF

rm -f dist.zip
echo "Frontend deployed successfully to ${REMOTE_HOST}."
