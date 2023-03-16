# /bin/bash
/node_tester_app_beta/script/stop.sh
nohup node /node_tester_app_beta/script/daemon.js linux Agnet >> server.log 2>&1 &
echo "start node_tester_app_beta success"
exit 0

