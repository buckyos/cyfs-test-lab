
## Issuse Link

[ #217 Optimize AppManager's DecApp installation process](https://github.com/buckyos/CYFS/issues/217)


## Issuse Verification

### Testing Environment

Nighlty ： 1.1.0.753-preview

OOD System : cyfs-test-lab::PC-0005(Ubuntu22)/cyfs-test-lab::PC-0014(Windows10)

## Testing case

### Linux OOD run with SandBoxMode::Docker mode

#### The app-manager breaks down when attempting to download a DEC APP

Steps:
+ Install dec-app cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT
+ When DEC APP is downloading files, kill the app-manager process
+ When the app-manager is restarted by ood-daemon,Check the result of this app`status.


Results:
+ The app-manager will reinstall 9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT sucesss,but not start this DEC APP service.

Issuse [#238](https://github.com/buckyos/CYFS/issues/238)

#### The app-manager breaks down when DEC APP is running "npm i"

Steps: 

+ Install dec-app-service-many-npm-packages cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT
+ When DEC APP is running "npm i", kill the app-manager process
+ When the app-manager is restarted by ood-daemon,Check the result of this app`status.

Results:
+ The app-manager will reinstall 9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT and Installfailed 

Issuse [#239](https://github.com/buckyos/CYFS/issues/239)

#### The app-manager breaks down when DEC APP is init service

Steps:

+ Install dec-app-service-many-npm-packages cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT
+ When DEC APP is running "node service/service.js --install", kill the app-manager process
+ When the app-manager is restarted by ood-daemon,Check the result of this app`status.

Results:
+ The app-manager will reinstall 9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT sucess and start sucess;


### Windows OOD run with SandBoxMode::No mode

#### The app-manager breaks down when attempting to download a DEC APP

Steps:
+ Install dec-app cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT
+ When DEC APP is downloading files, kill the app-manager process
+ When the app-manager is restarted by ood-daemon,Check the result of this app`status.

Results:
+ The app-manager will reinstall 9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT sucesss,but not start this DEC APP service.

Issuse [#238](https://github.com/buckyos/CYFS/issues/238)

#### The app-manager breaks down when DEC APP is running "npm i"

Steps: 

+ Install dec-app-service-many-npm-packages cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT
+ When DEC APP is running "npm i", kill the app-manager process
+ When the app-manager is restarted by ood-daemon,Check the result of this app`status.

Results:
+ The app-manager will reinstall 9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT and Installfailed 

Issuse [#207](https://github.com/buckyos/CYFS/issues/207)

#### The app-manager breaks down when DEC APP is init service

Steps:

+ Install dec-app-service-many-npm-packages cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT
+ When DEC APP is running "node service/service.js --install", kill the app-manager process
+ When the app-manager is restarted by ood-daemon,Check the result of this app`status.

Results:
+ The app-manager will reinstall 9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT sucess and start sucess;