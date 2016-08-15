# What is sslping.com

https://sslping.com allows you to monitor your SSL/TLS certificates and 
security configuration easily and for free. You'll receive an email if your
certificates expire, or if a misconfiguration is detected.

# Usage

This CLI allows you to bulk-load servers to sslping.com

Install with `npm install -g sslping-cli`

Usage: `sslping-cli -u [email] -p [password] server[:port] ...`

Example: `sslping-cli -u me@mydomain -p myPassword google.com facebook.com twitter.com`
or `cat servers.txt | xargs sslping-cli -u me@mydomain -p myPassword`

Servers are then added to your account (and checked!).
