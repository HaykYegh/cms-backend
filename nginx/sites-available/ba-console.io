server {

        listen 443 ssl;

        ssl_certificate /etc/nginx/ssl/brilliant.crt;
        ssl_certificate_key /etc/nginx/ssl/brilliant.key;

        root /var/www/console.frontend;

        index index.html index.htm;

        server_name nconsole.brilliant.com.bd;

        access_log /var/log/nginx/access.log;
        error_log /var/log/nginx/error.log;


        location / {
               try_files $uri /index.html;
        }

        location ~ /\.ht {
                deny all;
        }
}

