
## Issuse Link

[#207 WIndows App-manager is interrupted and cannot be recovered during the installation of DEC APP npm i ](https://github.com/buckyos/CYFS/issues/207)


## Issuse Verification

### Testing Environment

Nighlty ： 1.1.0.753-preview

OOD System : Windows10

+ dec-app-service-many-npm-packages cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT : DEC APP installation will run "npm i ",Set many npm packages to downloading.

### Verification Step:

+ Install dec app  cyfs://5r4MYfFJ7ktzBzSi1sWmU7BJLgpEEdp8ukbWemsFuQc1/9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT
+ When installation of 9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT is running "npm i" ,kill app-manager process
+ When app-manager auto start , check DEC APP 9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT reinstall result
+ DEC APP 9tGpLNnPZPoULTFVB6tbzrLkHS564isyc54PmWuNW6DT InstallFailed

[app-manager_7880_rCURRENT.log](https://github.com/buckyos/CYFS/files/11303019/app-manager_7880_rCURRENT.log)
[app-manager_9148_rCURRENT.log](https://github.com/buckyos/CYFS/files/11303021/app-manager_9148_rCURRENT.log)