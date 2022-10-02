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

./generate_nginx_conf.bash <SERVER_NAME> <IP_RANGE> <ROOT_PATH> 

# start nginx service
./start_nginx_server.bash 

# create spectral archive server config file
./generate_param_for_small_archive.bash 
# start spectral archive web interface
# ATTENTION: BEFORE you run the following command, make sure edit it to set the correct path for fastcgi_similarity.fcgi.
./launch_archive.bash 
```

Notice that we need the spectral archive tool to be called. User should change the path inside launch_archive.bash to make the script work. 

## stop the web interface
To stop the spectral archive interface, one can type-in CTRL+C to terminate the spawn-fcgi process. 

## stop the nginx service
To stop the nginx service, one can run the following commands.

```bash
cd scripts/
./quit_nginx_server.bash
```
