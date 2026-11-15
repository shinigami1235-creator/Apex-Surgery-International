#!/bin/bash
# Starts the WordPress test server on http://localhost:8080 (does nothing if it is already up).
if curl -s -o /dev/null --max-time 3 http://localhost:8080/wp-login.php; then echo "already running"; exit 0; fi
cd /home/claude/wp
PHP_CLI_SERVER_WORKERS=4 nohup php -S 127.0.0.1:8080 -t /home/claude/wp/site /home/claude/wp/router.php >> /home/claude/wp/server.log 2>&1 &
echo $! > /home/claude/wp/server.pid
