@echo off
title SocietySync Production Build Tool
cls
echo ===================================================
echo   SOCIETYSYNC PRODUCTION BUILD TOOL (WINDOWS)
echo ===================================================
echo.
echo Please select a build option:
echo.
echo [1] Build Android App (Preview APK) - EAS
echo [2] Build Android App (Production AAB) - EAS
echo [3] Build iOS App (Production) - EAS
echo [4] Export Mobile Web App (Static Assets)
echo [5] Build Admin Portal (Next.js Production)
echo [6] Build All Web Components (Mobile Web + Portal)
echo [7] Exit
echo.
set /p opt="Enter choice (1-7): "

if "%opt%"=="1" goto build_android_preview
if "%opt%"=="2" goto build_android_prod
if "%opt%"=="3" goto build_ios_prod
if "%opt%"=="4" goto build_mobile_web
if "%opt%"=="5" goto build_portal_prod
if "%opt%"=="6" goto build_all_web
if "%opt%"=="7" goto end
echo Invalid option selected.
pause
goto end

:build_android_preview
echo.
echo Running EAS Build Android (Preview)...
npm run build_android
goto end

:build_android_prod
echo.
echo Running EAS Build Android (Production)...
npm run build_android_production
goto end

:build_ios_prod
echo.
echo Running EAS Build iOS...
npm run build_ios
goto end

:build_mobile_web
echo.
echo Exporting Mobile Web App static assets...
npm run build_web
goto end

:build_portal_prod
echo.
echo Building Admin Portal for production...
npm run portal:build
goto end

:build_all_web
echo.
echo Building all web and portal assets...
call npm run build_web
call npm run portal:build
goto end

:end
echo.
echo Build process finished. Press any key to exit.
pause >nul
