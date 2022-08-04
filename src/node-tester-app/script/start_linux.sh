# /bin/bash
/node_tester_app/script/stop.sh
nohup node /node_tester_app/script/daemon.js linux Agnet >> server.log 2>&1 &
echo "start node_tester_app success"
exit 0

