# /bin/bash
pid_array=($(ps aux|grep "/node_test/cyfs-test-lab/src/node-tester-server/agent_master/main.js" | grep -v "grep" | awk -F " " '{print $2}'))
for pid in ${pid_array[@]}
do
{
        echo "kill -9 ${pid}"
        kill -9 ${pid}
} &
done
wait