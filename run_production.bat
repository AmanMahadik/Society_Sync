@echo off
title SocietySync - Production Web Server
echo =======================================================
echo  SocietySync - Running Production Web Build Locally
echo =======================================================
echo.
echo Starting local production static server on the /dist directory.
echo.
call npm run run_production
echo.
echo =======================================================
echo  Production Server Stopped
echo =======================================================
pause
