cd ../../../CYFS/src
git pull
cargo build -p zone-simulator --release
taskkill /f /t /im zone-simulator.exe
xcopy /y/d/s/e ".\target\release\zone-simulator.exe" "..\..\src\cyfs-test-dec-app\cyfs"
