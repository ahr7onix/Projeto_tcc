@echo off
echo Iniciando NutriCare...

:: ── Pasta de logs ─────────────────────────────────────
if not exist "%~dp0logs" mkdir "%~dp0logs"

:: ── IP local para o Expo Go funcionar no celular ──────
set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "192.168."') do (
    if not defined LOCAL_IP set "LOCAL_IP=%%a"
)
if not defined LOCAL_IP (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "172."') do (
        if not defined LOCAL_IP set "LOCAL_IP=%%a"
    )
)
if not defined LOCAL_IP (
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R "IPv4"') do (
        if not defined LOCAL_IP set "LOCAL_IP=%%a"
    )
)
set LOCAL_IP=%LOCAL_IP: =%

echo [INFO] IP local detectado: %LOCAL_IP%
echo EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:3000 > "%~dp0apps\mobile\.env"

:: ── Serviços ───────────────────────────────────────────
echo [1/3] Subindo banco de dados e API (Docker)...
echo [INFO] Na primeira vez a imagem da API sera compilada, aguarde...
docker-compose up -d --build
timeout /t 3 /nobreak >nul

echo [2/3] Iniciando web do nutricionista (porta 5173)...
start "NutriCare - Web" cmd /k "cd /d %~dp0apps\web && npm install && npm run dev"

echo [3/3] Iniciando app mobile com log de erros...
start "NutriCare - Mobile" cmd /k "%~dp0expo-com-log.bat"

echo.
echo Tudo iniciado!
echo  - API:          http://localhost:3000
echo  - Web:          http://localhost:5173
echo  - Mobile:       escaneie o QR Code na janela do Expo
echo  - Log de erros: %~dp0logs\expo-errors.log
echo.
echo Para ver logs da API: docker logs -f tcc-api
echo.
pause
