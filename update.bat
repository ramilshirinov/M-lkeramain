@echo off
echo Yenilikler gonderilir...
git add .
git commit -m "Avtomatik yenileme"
git push origin main
echo Hazirdir!
pause