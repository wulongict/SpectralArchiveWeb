set -x

echo "Removing spectroscape nginx site"
sudo rm -f /etc/nginx/sites-enabled/spectroscape.conf
sudo nginx -s reload
