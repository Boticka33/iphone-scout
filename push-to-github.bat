@echo off
echo ========================================================
echo   iPhone Scout - Automatic GitHub Uploader
echo ========================================================
echo.
set /p REPO_URL="Vlozte URL vaseho GitHub repozitare [Enter pro default: https://github.com/Boticka33/iphone-scout.git]: "

if "%REPO_URL%"=="" (
    set REPO_URL=https://github.com/Boticka33/iphone-scout.git
)

echo.
echo [1/4] Inicializuji Git...
git init

echo [2/4] Pridavam soubory...
git add .

echo [3/4] Vytvarim commit...
git config user.email "user@example.com"
git config user.name "User"
git commit -m "Initial commit for iphone-scout"

echo [4/4] Odesilam na GitHub (%REPO_URL%)...
git branch -M main
git remote add origin %REPO_URL%
git push -u origin main

echo.
echo ========================================================
echo   HOTOVO! Projekt byl uspesne nahran na vas GitHub!
echo ========================================================
pause
