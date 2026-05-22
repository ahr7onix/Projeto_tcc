@echo off
echo Iniciando NutriCare...

echo [1/4] Subindo banco de dados (Docker)...
docker-compose up -d
timeout /t 2 /nobreak >nul

echo [2/4] Iniciando servidor API (porta 3000)...
start "NutriCare - API" cmd /k "cd /d %~dp0apps\api && npm run start:dev"

echo [3/4] Iniciando web do nutricionista (porta 5173)...
start "NutriCare - Web" cmd /k "cd /d %~dp0web\web_nutricionista && npm run dev"

echo [4/4] Iniciando app mobile (QR Code)...
start "NutriCare - Mobile" cmd /k "cd /d %~dp0apps\mobile && npx expo start --clear"

echo.
echo Tudo iniciado! Aguarde as janelas carregarem.
echo  - API:    http://localhost:3000
echo  - Web:    http://localhost:5173
echo  - Mobile: escaneie o QR Code na janela do Expo
pause
