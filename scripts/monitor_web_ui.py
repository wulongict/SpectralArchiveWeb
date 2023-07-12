# Check the status of the Spectroscape web UI
# Usage: python monitor_web_ui.py
# set up the task in cron job, for every 10 minutes
# */10 * * * * python /home/spectroscape/spectroscape/scripts/monitor_web_ui.py
# send an email to the admin if the web UI is not working properly
# Created on July 12, 2023

from urllib.request import urlopen
from urllib.error import URLError
from urllib.error import HTTPError
from http import HTTPStatus
 
# get the status of a website
def get_website_status(url):
    # handle connection errors
    try:
        # open a connection to the server with a timeout
        with urlopen(url, timeout=3) as connection:
            # get the response code, e.g. 200
            code = connection.getcode()
            return code
    except HTTPError as e:
        return e.code
    except URLError as e:
        return e.reason
    except:
        return e
 
# interpret an HTTP response code into a status
def get_status(code):
    if code == HTTPStatus.OK:
        return 'OK'
    return 'ERROR'
 
# check status of a list of websites

def check_status_urls(urls):
    url_dict={}
    for url in urls:
        # get the status for the website
        code = get_website_status(url)
        # interpret the status
        status = get_status(code)
        if status == 'ERROR':
            url_dict[url]=status
        # report status
        print(f'{url:20s}\t{status:5s}\t{code}')
        
        
def check_specroscape_web_ui_status():
    urls = ['http://omics.ust.hk:8709',
        'http://omics.ust.hk',
        'http://spectroscape.cc',
        'http://spectroscape.cc:8709']
    
    url_dict={}
    error_found = False
    for url in urls:
        # get the status for the website
        code = get_website_status(url+'/summary')
        # interpret the status
        status = get_status(code)
        if status == 'ERROR':
            error_found = True
        url_dict[url]=status
        
    if error_found:
        print('\"Dear Admin,\n\n')
        print('The Spectroscape web UI is not working properly. Please check the following URLs:')
        for url in url_dict:
            print(f'{url:20s}\t{url_dict[url]:5s}\t{code}')
            
        print('\n\nBest regards,\nSpectroscape Team\"')
        exit(1)
        
    exit(0)
    
        
        
    
        
check_specroscape_web_ui_status()


 
# # list of urls to check
# URLS = ['http://omics.ust.hk:8709/summary',
#         'http://omics.ust.hk/summary',

#         'http://spectroscape.cc/summary',
#         'http://spectroscape.cc:8709/summary']
# # check all urls
# check_status_urls(URLS)

# 'http://omics.ust.hk:8704/summary',
# 'http://omics.ust.hk:8701/summary',
# 'http://omics.ust.hk:8702/summary',