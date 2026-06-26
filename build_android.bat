@echo off
title SocietySync - Android APK Build
echo =======================================================
echo  SocietySync - Triggering Installable Android APK Build
echo =======================================================
echo.
echo Running EAS Build for Android (Preview Profile - APK).
echo Make sure you have installed eas-cli (npm install -g eas-cli)
echo and logged in (npx eas login) before running this script.
echo.
call npm run build_android
echo.
echo =======================================================
echo  Android APK Build Process Completed / Terminated
echo =======================================================
pause
