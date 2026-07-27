set -x

echo "Starting"
# sudo nginx -p ./ -c archive_nginx.conf 

sudo cp spectroscape.conf /etc/nginx/sites-available/spectroscape.conf
sudo ln -s /etc/nginx/sites-available/spectroscape.conf /etc/nginx/sites-enabled/spectroscape.conf
sudo nginx -s reload
