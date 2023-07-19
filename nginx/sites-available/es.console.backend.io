server {
        listen [::]:443 ssl;
        listen 443 ssl;

        ssl on;
        ssl_certificate /etc/nginx/ssl/esim/esim.crt;
        ssl_certificate_key /etc/nginx/ssl/esim/esim.key;

        client_max_body_size 20m;
        server_name api-console.esimglobal.net;

        access_log /var/log/nginx/api-console.esimglobal.net.bd.access.log;
        error_log /var/log/nginx/api-console.esimglobal.net.error.log;

        location / {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
}


