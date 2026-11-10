@echo off
setlocal DisableDelayedExpansion
title Digi-Condominio - Mantener esta ventana abierta
pushd "%~dp0"
if errorlevel 1 goto folder_error
set "DIGI_NODE=%CD%\runtime\node.exe"
if exist "%DIGI_NODE%" goto check_node
where node.exe >nul 2>nul
if errorlevel 1 goto missing_node
set "DIGI_NODE=node.exe"
:check_node
"%DIGI_NODE%" -e "const [a,b]=process.versions.node.split('.').map(Number);if(a<22||(a===22&&b<16))process.exit(1);require('node:sqlite')" >nul 2>nul
if errorlevel 1 goto invalid_node
echo.
echo Iniciando Digi-Condominio...
echo El navegador se abrira cuando la aplicacion este lista.
echo Mantenga esta ventana abierta durante el uso.
echo.
"%DIGI_NODE%" "%CD%\server\local-launcher.js"
set "DIGI_EXIT=%ERRORLEVEL%"
if "%DIGI_EXIT%"=="0" goto finished
echo.
echo No se pudo iniciar. Revise el mensaje anterior y LEEME-WINDOWS.txt.
if not "%DIGI_NO_PAUSE%"=="1" pause
popd
exit /b %DIGI_EXIT%
:missing_node
echo.
echo Falta el motor de la aplicacion.
echo Extraiga TODO el ZIP antes de abrir este archivo.
echo La carpeta runtime debe estar junto al iniciador.
echo Si descargo el codigo de GitHub, instale Node.js 24 LTS desde https://nodejs.org/
goto failed
:invalid_node
echo.
echo El motor no es compatible o no se puede ejecutar.
echo Use el paquete Windows x64 en un PC Intel o AMD de 64 bits.
echo Como alternativa, instale Node.js 24 LTS desde https://nodejs.org/
goto failed
:folder_error
echo No se pudo abrir la carpeta. Extraiga el ZIP en una carpeta de su PC.
if not "%DIGI_NO_PAUSE%"=="1" pause
exit /b 1
:failed
if not "%DIGI_NO_PAUSE%"=="1" pause
popd
exit /b 1
:finished
popd
exit /b 0
