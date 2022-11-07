@echo off
set channel=%1
echo update cyfs git code
cd ../CYFS
git checkout %channel%
git reset --hard origin/%channel%
exit
