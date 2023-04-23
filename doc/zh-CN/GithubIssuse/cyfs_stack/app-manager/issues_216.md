
## Issuse Link

[#216 Install DEC APP run command "npm i --production --force" failed](https://github.com/buckyos/CYFS/issues/216)


## Issuse Verification

### Testing Environment

Nighlty ： 1.1.0.753-preview

OOD System : Ubuntu22

dec-app-install-timeout : cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnhV6Hh86h6y5SLYnBQ6Q4SttTrgnSLWTsyjTci

set install command:
```
"install": ["npm i --production --force", "node service/service.js --install"],
```
### Verification Step:

+ Install dec app cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnhV6Hh86h6y5SLYnBQ6Q4SttTrgnSLWTsyjTci
+ Check install result: Install DEC APP sucesss
+ Check install log:
```
[2023-04-23 12:07:50.247422 +08:00] INFO [ThreadId(11)] [service/app-manager/src/dapp.rs:110] load dapp package.cfg success, json content: Object {"executable": Array [], "id": String("dec-app-service"), "install": Array [String("npm i --production --force"), String("node service/service.js --install")], "start": String("node service/service.js --start"), "status": String("node service/service.js --status"), "stop": String("node service/service.js --stop"), "version": String("1.0.0")}
[2023-04-23 12:07:52.380739 +08:00] INFO [ThreadId(9)] [service/app-manager/src/dapp.rs:110] load dapp package.cfg success, json content: Object {"executable": Array [], "id": String("dec-app-service"), "install": Array [String("npm i --production --force"), String("node service/service.js --install")], "start": String("node service/service.js --start"), "status": String("node service/service.js --status"), "stop": String("node service/service.js --stop"), "version": String("1.0.0")}
[2023-04-23 12:07:52.452760 +08:00] INFO [ThreadId(9)] [service/app-manager/src/docker_api.rs:276] start app 9tGpLNnhV6Hh86h6y5SLYnBQ6Q4SttTrgnSLWTsyjTci install cmd npm i --production --force in docker
[2023-04-23 12:07:52.521602 +08:00] INFO [ThreadId(9)] [service/app-manager/src/docker_api.rs:79] will spawn cmd: docker run --name decapp-9tgplnnhv6hh86h6y5slynbq6q4stttrgnslwtsyjtci-install --cap-add NET_ADMIN --cap-add NET_RAW --rm --init --network bridge -v /cyfs/log/app/9tGpLNnhV6Hh86h6y5SLYnBQ6Q4SttTrgnSLWTsyjTci:/cyfs/log/app -v /cyfs/data/app/9tGpLNnhV6Hh86h6y5SLYnBQ6Q4SttTrgnSLWTsyjTci:/cyfs/data/app/9tGpLNnhV6Hh86h6y5SLYnBQ6Q4SttTrgnSLWTsyjTci -v /cyfs/app/dockerfile/9tGpLNnhV6Hh86h6y5SLYnBQ6Q4SttTrgnSLWTsyjTci/start.sh:/opt/start.sh:ro -v /cyfs/tmp:/cyfs/tmp -v /etc/localtime:/etc/localtime:ro -v /etc/resolv.conf:/etc/resolv.conf:ro -v /cyfs/app/9tGpLNnhV6Hh86h6y5SLYnBQ6Q4SttTrgnSLWTsyjTci:/opt/app buckyos/dec-app-base:v1 npm i --production --force
[2023-04-23 12:11:19.297240 +08:00] INFO [ThreadId(9)] [service/app-manager/src/docker_api.rs:312] app 9tGpLNnhV6Hh86h6y5SLYnBQ6Q4SttTrgnSLWTsyjTci run install cmd npm i --production --force success
[2023-04-23 12:11:24.227342 +08:00] INFO [ThreadId(8)] [service/app-manager/src/dapp.rs:110] load dapp package.cfg success, json content: Object {"executable": Array [], "id": String("dec-app-service"), "install": Array [String("npm i --production --force"), String("node service/service.js --install")], "start": String("node service/service.js --start"), "status": String("node service/service.js --status"), "stop": String("node service/service.js --stop"), "version": String("1.0.0")}
```