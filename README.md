# Web interface of Spectroscape

## Set up the interface.

We have provided an example archive in smallArchive folder. To set up the web interface, we should run the following command to start the web interface.

```bash
cd scripts/
# create the config file for nginx service
# ATTENTION: BEFORE you run the following command, make sure SERVER_NAME is correct. it's OK to use localhost. 
# e.g. 
# ./generate_nginx_conf.bash localhost 143.89.0.0/16 ../arxiv 
# using absolute path instead of relative path as shown above ../arxiv 
#
# This writes ./spectroscape.conf, a config fragment that gets installed as a
# site into the system's nginx (it is NOT a standalone nginx.conf, so it must
# not be run directly with `nginx -c`).

./generate_nginx_conf.bash <SERVER_NAME> <IP_RANGE> <ROOT_PATH> 

# install and (re)start nginx service
# this copies spectroscape.conf into /etc/nginx/sites-available/, symlinks it
# into /etc/nginx/sites-enabled/, and reloads the system nginx service.
# requires sudo and a working system nginx installation.
# NOTE: if port 80 is wanted, make sure no other enabled site (e.g. the
# Ubuntu default site at /etc/nginx/sites-enabled/default) is already bound
# to it, or nginx will fail to reload.
./start_nginx_server.bash 

# create spectral archive server config file
./generate_param_for_small_archive.bash 
# start spectral archive web interface
# ATTENTION: BEFORE you run the following command, make sure edit it to set the correct path for spectroscape.
./launch_archive.bash 
```

Notice that we need the spectral archive tool to be called. User should change the path inside launch_archive.bash to make the script work. 

## stop the web interface
To stop the spectral archive interface, one can type-in CTRL+C to terminate the spawn-fcgi process. 

## stop the nginx service
To stop serving the spectroscape site, one can run the following commands. This removes the
spectroscape site from nginx and reloads it, without stopping the system nginx service itself
(which may still be serving other sites).

```bash
cd scripts/
./quit_nginx_server.bash
```
