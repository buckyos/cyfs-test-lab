
## Issuse Link

[ #203 App-manager doesn't stop install docker container after install timeout](https://github.com/buckyos/CYFS/issues/203)


## Issuse Verification

### Testing Environment

Nighlty ： 1.1.0.753-preview

OOD System : Ubuntu22

dec-app-install-timeout : cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnSN39JEAfMzKs1GFCe5GsPhbRXt49fCnL84A6g


+ 14 minutes after starting the installation
```
CONTAINER ID   IMAGE                     COMMAND                  CREATED          STATUS          PORTS     NAMES
64e54f4f0837   buckyos/dec-app-base:v1   "/bin/bash /opt/star…"   14 minutes ago   Up 14 minutes             decapp-9tgplnnsn39jeafmzks1gfce5gsphbrxt49fcnl84a6g-install
e6c39906d9db   buckyos/dec-app-base:v1   "/bin/bash /opt/star…"   40 hours ago     Up 40 hours               decapp-9tgplnndpfrjuf59sszidvapupd8qnfjusqkh8geny3q
```
+ 15 minutes after starting the installation
```
CONTAINER ID   IMAGE                     COMMAND                  CREATED          STATUS          PORTS     NAMES
64e54f4f0837   buckyos/dec-app-base:v1   "/bin/bash /opt/star…"   15 minutes ago   Up 15 minutes             decapp-9tgplnnsn39jeafmzks1gfce5gsphbrxt49fcnl84a6g-install
e6c39906d9db   buckyos/dec-app-base:v1   "/bin/bash /opt/star…"   40 hours ago     Up 40 hours               decapp-9tgplnndpfrjuf59sszidvapupd8qnfjusqkh8geny3q
```
+ 16 minutes after starting the installation
```
CONTAINER ID   IMAGE                     COMMAND                  CREATED          STATUS          PORTS     NAMES
64e54f4f0837   buckyos/dec-app-base:v1   "/bin/bash /opt/star…"   15 minutes ago   Up 15 minutes             decapp-9tgplnnsn39jeafmzks1gfce5gsphbrxt49fcnl84a6g-install
e6c39906d9db   buckyos/dec-app-base:v1   "/bin/bash /opt/star…"   40 hours ago     Up 40 hours               decapp-9tgplnndpfrjuf59sszidvapupd8qnfjusqkh8geny3q
```
+ Reinstall this dec app
```
CONTAINER ID   IMAGE                     COMMAND                  CREATED         STATUS         PORTS     NAMES  
e1d0fc90ffb6   buckyos/dec-app-base:v1   "/bin/bash /opt/star…"   9 seconds ago   Up 7 seconds             decapp-9tgplnnsn39jeafmzks1gfce5gsphbrxt49fcnl84a6g-install  
e6c39906d9db   buckyos/dec-app-base:v1   "/bin/bash /opt/star…"   40 hours ago    Up 40 hours              decapp-9tgplnndpfrjuf59sszidvapupd8qnfjusqkh8geny3q  
```