@echo off
title SocietySync - Web Static Export
echo =======================================================
echo  SocietySync - Exporting Production Web Assets
echo =======================================================
echo.
echo Compiling and packaging optimized static bundle into /dist directory.
echo.
call npm run build_web
echo.
echo =======================================================
echo  Web Export Process Completed
echo =======================================================
pause
