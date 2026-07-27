#!/bin/bash
# write the conf for nginx
#
# This script writes ./spectroscape.conf, a config fragment meant to be
# installed into the system nginx as a site (see start_nginx_server.bash),
# NOT a standalone config for `nginx -p ./ -c ...`. It is included inside
# the system nginx's existing http{} block, so it must not declare its own
# events{}/http{} blocks or redeclare directives already set globally in
# /etc/nginx/nginx.conf (e.g. gzip on).

if [ "$#" -lt 3 ]; then
    echo "Illegal number of parameters"
    echo "$0 SERVER_NAME IP_ALLOWED ROOT_PATH"
    echo "Example:"
    echo "$0 localhost 143.89.0.0/16 ../arxiv"
    echo "or"
    echo "$0 localhost all ../arxiv"
    exit
fi

SERVER_NAME=$1
IP_ALLOWED=$2
ROOT_PATH=$3
#-----------------------------Change the SERVER_NAME, IP_ALLOWED, ROOT_PATH properly.----------------
#-----------------------------Do NOT change any other settings below

cat <<- EOF > spectroscape.conf

#include `pwd`/nginx-blockips-inthisfile.conf;

gzip_comp_level  9;

gzip_types    text/plain application/javascript application/x-javascript application/json text/javascript text/xml text/css;
fastcgi_param  GATEWAY_INTERFACE  CGI/1.1;
fastcgi_param  SERVER_SOFTWARE    nginx;
fastcgi_param  QUERY_STRING       \$query_string;
fastcgi_param  REQUEST_METHOD     \$request_method;
fastcgi_param  CONTENT_TYPE       \$content_type;
fastcgi_param  CONTENT_LENGTH     \$content_length;
fastcgi_param  SCRIPT_FILENAME    \$document_root\$fastcgi_script_name;
fastcgi_param  SCRIPT_NAME        \$fastcgi_script_name;
fastcgi_param  REQUEST_URI        \$request_uri;
fastcgi_param  DOCUMENT_URI       \$document_uri;
fastcgi_param  DOCUMENT_ROOT      \$document_root;
fastcgi_param  SERVER_PROTOCOL    \$server_protocol;
fastcgi_param  REMOTE_ADDR        \$remote_addr;
fastcgi_param  REMOTE_PORT        \$remote_port;
fastcgi_param  SERVER_ADDR        \$server_addr;
fastcgi_param  SERVER_PORT        \$server_port;
fastcgi_param  SERVER_NAME        \$server_name;

server {
    auth_basic "login";
    root $ROOT_PATH;
    listen 80;
    server_name localhost ${SERVER_NAME};
    location / {
        include  /etc/nginx/mime.types;

        allow $IP_ALLOWED;
        deny all;
    }

    include `pwd`/shared_location.conf;

    location ~ ^/(id|spectrum|peptideseq|identification|remark|summary) {
        fastcgi_pass   127.0.0.1:8710;
    }


}

server {
    auth_basic "login";
    root $ROOT_PATH;
    listen 8701;
    server_name localhost ${SERVER_NAME};
    location / {
        include  /etc/nginx/mime.types;

        #return 200 $document_root;
        allow $IP_ALLOWED;
        deny all;
    }

    include `pwd`/shared_location.conf;


    location ~ ^/(id|spectrum|peptideseq|identification|remark|summary) {
        fastcgi_pass   127.0.0.1:8711;
    }


}


server {
    auth_basic "login";
    root $ROOT_PATH;
    listen 8709;
    server_name ${SERVER_NAME} localhost;


    location / {
        include  /etc/nginx/mime.types;

            allow $IP_ALLOWED;
    		allow 127.0.0.1;
            deny all;
    }

    include `pwd`/shared_location.conf;

    location ~ ^/(id|spectrum|peptideseq|identification|remark|summary) {
        fastcgi_pass   127.0.0.1:8710;
    }


}
server {
    auth_basic "login";
    auth_basic_user_file /etc/apache2/passwd/passwords;
    root $ROOT_PATH;

    listen 8703;
    server_name localhost ${SERVER_NAME};
    location / {
        include  /etc/nginx/mime.types;

        allow $IP_ALLOWED;
        deny all;
    }
    include `pwd`/shared_location.conf;

    location ~ ^/(id|spectrum|peptideseq|identification|remark|summary) {
        fastcgi_pass   127.0.0.1:8713;
    }


}
server {
    auth_basic "login";
    auth_basic_user_file /etc/apache2/passwd/passwords;
    root $ROOT_PATH;

    listen 8702;
    server_name localhost ${SERVER_NAME};
    location / {
        include  /etc/nginx/mime.types;

        allow $IP_ALLOWED;
        deny all;
    }

    include `pwd`/shared_location.conf;


    location ~ ^/(id|spectrum|peptideseq|identification|remark|summary) {
        fastcgi_pass   127.0.0.1:8712;
    }


}
EOF
