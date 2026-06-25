@echo off
title SocietySync - iOS Build
echo =======================================================
echo  SocietySync - Triggering Production iOS Build
echo =======================================================
echo.
echo Running EAS Build for iOS (requires Apple Developer config).
echo.
call npm run build_ios
echo.
echo =======================================================
echo  iOS Build Process Completed / Terminated
echo =======================================================
pause
