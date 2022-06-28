set -x
# start nginx server with parameter file ./spectral_archive_nginx_fcgi.conf 
echo "Quit Old nginx server"
sudo nginx -p ./  -c archive_nginx.conf -s quit

