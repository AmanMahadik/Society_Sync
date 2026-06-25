@echo off
title SocietySync - Android Build
echo =======================================================
echo  SocietySync - Triggering Production Android Build
echo =======================================================
echo.
echo Running EAS Build for Android (requires EAS account config).
echo.
call npm run build_android
echo.
echo =======================================================
echo  Android Build Process Completed / Terminated
echo =======================================================
pause
