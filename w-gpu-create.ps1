cd \Projects\functal

git config --global user.email "user@example.com"
git config --global user.name "User Name"

"v1.5.4" | out-file -append c:\debug.txt

get-date | out-file -append c:\debug.txt

git pull -X theirs *>&1 | tee -append -filepath c:\debug.txt

.\w-gpu-create-3d.ps1
