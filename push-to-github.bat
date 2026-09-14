@echo off
chcp 65001 > nul
title iPhone Scout - GitHub Uploader
echo ========================================================
echo    iPhone Scout - Automatický Upload na GitHub
echo ========================================================
echo.
echo Tento skript obchází limit 100 souborů ve webovém uploaderu GitHubu.
echo.
set /p REPO_URL="Vložte URL vášho repozitáře z GitHubu (např. https://github.com/jmeno/iphone-scout.git): "

if "%REPO_URL%"=="" (
    echo [CHYBA] Nebyla zadána žádná URL adresa.
    pause
    exit /b
)

echo.
echo [1/4] Inicializuji Git repozitář...
git init

echo [2/4] Přidávám soubory ze složky alpha...
git add .

echo [3/4] Vytvářím prvotní commit...
git commit -m "Deploy iphone-scout project"

echo [4/4] Propojuji s %REPO_URL% a odesílám...
git branch -M main
git remote add origin %REPO_URL%
git push -u origin main

echo.
echo ========================================================
echo    HOTOVO! Projekt byl úspěšně nahrán na váš GitHub!
echo ========================================================
pause
