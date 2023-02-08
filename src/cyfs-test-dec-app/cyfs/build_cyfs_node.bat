cd ../../../cyfs-ts-sdk
git pull
call npm i 
call npm run build
xcopy /y/d/s/e ".\out\cyfs_node*" "..\src\cyfs-test-dec-app\cyfs\"