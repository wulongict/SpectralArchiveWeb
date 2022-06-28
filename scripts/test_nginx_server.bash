set -x

echo "Testing"
sudo nginx -p ./ -c archive_nginx.conf -t

