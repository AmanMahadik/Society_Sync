@echo off
title SocietySync - Android Production AAB Build
echo ==========================================================
echo  SocietySync - Triggering Production Android AAB Build
echo ==========================================================
echo.
echo Running EAS Build for Android (Production Profile - AAB).
echo Make sure you have installed eas-cli (npm install -g eas-cli)
echo and logged in (npx eas login) before running this script.
echo.
call npm run build_android_production
echo.
echo ==========================================================
echo  Android Production AAB Build Process Completed / Terminated
echo ==========================================================
pause
