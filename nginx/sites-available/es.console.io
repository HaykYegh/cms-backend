server {

        listen 443 ssl;

	ssl on;
        ssl_certificate /etc/nginx/ssl/esim/esim.crt;
        ssl_certificate_key /etc/nginx/ssl/esim/esim.key;

        root /var/www/es.console.frontend;

        index index.html index.htm;

        server_name console.esimglobal.net;

        access_log /var/log/nginx/es.access.log;
        error_log /var/log/nginx/es.error.log;


        location / {
               try_files $uri /index.html;
        }

        location ~ /\.ht {
                deny all;
        }
}

