
#!/bin/bash

pid_array=($(ps aux|grep "node ./script/daemon.js" | grep -v "grep" | awk -F " " '{print $2}'))

for pid in ${pid_array[@]}
do
{
        echo "kill -9 ${pid}"
        kill -9 ${pid}
} &
done
wait

pid_array=($(ps aux|grep "/script/master_main.js" | grep -v "grep" | awk -F " " '{print $2}'))

for pid in ${pid_array[@]}
do
{
        echo "kill -9 ${pid}"
        kill -9 ${pid}
} &
done
wait

pid_array=($(ps aux|grep "/script/startup.js" | grep -v "grep" | awk -F " " '{print $2}'))

for pid in ${pid_array[@]}
do
{
        echo "kill -9 ${pid}"
        kill -9 ${pid}
} &
done
wait


echo "stop finish!"