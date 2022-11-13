@echo off
set channel=%1
echo update cyfs-ts-sdk git code
cd ../../cyfs-ts-sdk
git checkout %channel%
git reset --hard origin/%channel%
echo update code success
exit
