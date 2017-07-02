# What is sslping.com

https://sslping.com allows you to monitor your SSL/TLS certificates and 
security configuration easily for free. You'll receive an email if your
certificates expire, or if a misconfiguration is detected.

# Install

You need node.js to use sslping-cli.

Install with `npm install -g sslping-cli`

# Usage

This CLI allows you to import new servers to sslping, and to export a JSON document with all your servers and status.

Help: `sslping-cli --help`

Import example: `sslping-cli -u me@mydomain -p myPassword import google.com facebook.com twitter.com`
or `cat servers.txt | xargs sslping-cli -u me@mydomain -p myPassword --quiet=true import > imported.csv` 

Export example: `sslping-cli -u me@mydomain -p myPassword --quiet=true export > myservers.json`

**Note: JSON export format may change in the future (ie. this route is used by the react webapp)**