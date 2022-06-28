set -x

echo "Starting"
sudo nginx -p ./ -c archive_nginx.conf 
