@echo off
if not exist "%~dp0logs" mkdir "%~dp0logs"
cd /d "%~dp0apps\mobile"
echo [EXPO] Iniciando em %DATE% %TIME% > "%~dp0logs\expo-errors.log"
npm install
npx expo start --clear 2>>"%~dp0logs\expo-errors.log"
