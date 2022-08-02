# /bin/bash
pid_array=($(ps aux|grep "/cyfs_server/pn-miner" | grep -v "grep" | awk -F " " '{print $2}'))
for pid in ${pid_array[@]}
do
{
        echo "kill -9 ${pid}"
        kill -9 ${pid}
} &
done
wait