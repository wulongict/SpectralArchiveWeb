# write the conf for nginx
#


SERVER_NAME=kez371.ust.hk
IP_ALLOWED=143.89.0.0/16
ROOT_PATH=../arxiv
#-----------------------------Change the SERVER_NAME, IP_ALLOWED, ROOT_PATH properly.----------------
#-----------------------------Do NOT change any other settings below

cat <<- EOF > archive_nginx.conf
events {
  worker_connections 1024;
}

http {

    #include `pwd`/nginx-blockips-inthisfile.conf;
    auth_basic "login";

    gzip             on;
    gzip_comp_level  9;

    gzip_types    text/plain application/javascript application/x-javascript application/json text/javascript text/xml text/css;
    include  /etc/nginx/mime.types;
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
        root $ROOT_PATH;
        listen 8701;
        server_name localhost ${SERVER_NAME};
        location / {
            include  /etc/nginx/mime.types;
            index faiss_ivf256_pq16_gpu.index.json.html;
            #return 200 $document_root;
            allow $IP_ALLOWED;
            deny all;
        }

        error_page 404 /custom_404.html;
        location = /custom_404.html {
                #root /usr/share/nginx/html;
                internal;
                allow all;
        }

        error_page 403 /custom_403.html;
        location /custom_403.html {
            allow all;
        }


        location /cloudsearch {
            index cloudsearch.html;
        }

        location ~ ^/(html|js|images) {
            #autoindex on;
        }

        location /css/ {
            #autoindex on;
            add_header  Content-Type    text/css;
        }



        location ~ ^/(id|spectrum|peptideseq|identification|remark) {
            fastcgi_pass   127.0.0.1:8711;
        }


    }


    server {

        root $ROOT_PATH;
	    listen 8709;
        server_name localhost ${SERVER_NAME};


        location / {
            include  /etc/nginx/mime.types;
            index faiss_ivf256_pq16_gpu.index.json.html;
                allow $IP_ALLOWED;
                deny all;
        }

        error_page 404 /custom_404.html;
        error_page 502 /custom_404.html;

        error_page 404 /custom_404.html;
        location = /custom_404.html {
                #root /usr/share/nginx/html;
                internal;
                allow all;
        }

        error_page 403 /custom_403.html;
        location /custom_403.html {
            allow all;
        }


        location /cloudsearch {
            index cloudsearch.html;
        }

        location ~ ^/(html|js|images) {
            #autoindex on;
        }

        location /css/ {
            #autoindex on;
            add_header  Content-Type    text/css;
        }


        location ~ ^/(id|spectrum|peptideseq|identification|remark) {
            fastcgi_pass   127.0.0.1:8710;
        }


    }
    server {
        # auth_basic           “Spectral Archive Login”;
        auth_basic_user_file /etc/apache2/passwd/passwords; 
        root $ROOT_PATH;
        
        listen 8703;
        server_name localhost ${SERVER_NAME};
        location / {
            include  /etc/nginx/mime.types;
            index faiss_ivf256_pq16_gpu.index.json.html;
            allow $IP_ALLOWED;
            deny all;
        }

        error_page 404 /custom_404.html;

        error_page 404 /custom_404.html;
        location = /custom_404.html {
                #root /usr/share/nginx/html;
                internal;
                allow all;
        }

        error_page 403 /custom_403.html;
        location /custom_403.html {
            allow all;
        }
        location /cloudsearch {
            index cloudsearch.html;
        }

        location ~ ^/(html|js|images) {
            #autoindex on;
        }

        location /css/ {
            #autoindex on;
            add_header  Content-Type    text/css;
        }


        location ~ ^/(id|spectrum|peptideseq|identification|remark) {
            fastcgi_pass   127.0.0.1:8713;
        }


    }
    server {

        # auth_basic           “Spectral Archive Login”;?
        auth_basic_user_file /etc/apache2/passwd/passwords; 
        root $ROOT_PATH;
        
        listen 8702;
        server_name localhost ${SERVER_NAME};
        location / {
            include  /etc/nginx/mime.types;
            index faiss_ivf256_pq16_gpu.index.json.html;
            allow $IP_ALLOWED;
            deny all;
        }
  
        error_page 404 /custom_404.html;
        location = /custom_404.html {
                #root /usr/share/nginx/html;
                internal;
                allow all;
        }

        error_page 403 /custom_403.html;
        location /custom_403.html {
            allow all;
        }


        location /cloudsearch {
            index cloudsearch.html;
        }

        location ~ ^/(html|js|images) {
            #autoindex on;
        }

        location /css/ {
            #autoindex on;
            add_header  Content-Type    text/css;
        }



        location ~ ^/(id|spectrum|peptideseq|identification|remark) {
            fastcgi_pass   127.0.0.1:8712;
        }


    }

}

EOF
