# jestlearn_server
Set up this server to enable syncing across devices
## Deploying
> Steps to deploy a Node.js app to a VPS using PM2, NGINX as a reverse proxy and an SSL from LetsEncrypt

## 1. Install Node/NPM
```
sudo apt get nodejs
```

## 2. Clone your project from Github
There are a few ways to get your files on to the server, I would suggest using Git
```
git clone jestlearn_server.git
```

### 3. Install dependencies and test app
```
cd jestlearn_server
npm install
npm start (or whatever your start command)
# stop app
ctrl+C
```
## 4. Setup PM2 process manager to keep your app running
```
sudo npm i pm2 -g
pm2 start server.js (or whatever your file name)

# Other pm2 commands
pm2 show server.js 
pm2 status
pm2 restart server.js 
pm2 stop server.js
pm2 logs (Show log stream)
pm2 flush (Clear logs)

# To make sure app starts when reboot
pm2 startup ubuntu
```
### You should now be able to access your app using your IP and port. Now we want to setup a firewall blocking that port and setup NGINX as a reverse proxy so we can access it directly using port 80 (http)

## 5. Setup ufw firewall
```
sudo ufw enable
sudo ufw status
sudo ufw allow ssh (Port 22)
sudo ufw allow http (Port 80)
sudo ufw allow https (Port 443)
```

## 6. Install NGINX and configure
```
sudo apt install nginx

sudo nano /etc/nginx/sites-available/default
```
Add the following to the location part of the server block
```
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000; #whatever port your app runs on
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
```
```
# Check NGINX config
sudo nginx -t

# Restart NGINX
sudo service nginx restart
```

### You should now be able to visit your IP with no port (port 80) and see your app. Now let's add a domain

## 7. Add domain in VPS
Add an A record for @ and for www to your vps domain settings


## Register and/or setup domain from registrar
Choose "Custom nameservers" and add these 3

(or whatever your vps nameservers are)
* ns1.digitalocean.com
* ns2.digitalocean.com
* ns3.digitalocean.com

It may take a bit to propogate

10. Add SSL with LetsEncrypt
```
sudo apt-get install python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Only valid for 90 days, test the renewal process with
certbot renew --dry-run
```

Now visit https://yourdomain.com and you should see your Node app