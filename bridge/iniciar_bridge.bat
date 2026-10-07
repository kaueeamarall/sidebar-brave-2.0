@echo off
chcp 65001 >nul
title Context Commander - Local Bridge
cd /d "%~dp0"

echo ========================================================
echo        CONTEXT COMMANDER - INICIANDO BRIDGE LOCAL
echo ========================================================
echo.
echo Verificando instalacao do Python...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao foi encontrado no PATH do sistema.
    echo Por favor, instale o Python ou certifique-se de adiciona-lo ao PATH.
    if /i not "%~1"=="silent" (
        echo Pressione qualquer tecla para sair...
        pause >nul
    )
    exit /b 1
)

echo [OK] Python encontrado!
python -m pip install --quiet --disable-pip-version-check pystray pillow >nul 2>&1
echo [*] Iniciando servidor do Bridge...
echo.

python server.py

if /i not "%~1"=="silent" pause
