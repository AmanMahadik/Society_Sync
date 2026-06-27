@echo off
title SocietySync - Deployment Control Panel
:menu
cls
echo =====================================================================
echo  🏢 SocietySync - DEPLOYMENT CONTROL PANEL
echo =====================================================================
echo  Current Directory: %CD%
echo  Supabase URL: https://nqpxlvbgzcfguijouhgl.supabase.co
echo =====================================================================
echo.
echo  Please select an option to build or deploy the app:
echo.
echo  [1] Build Android APK (Testing / Preview Profile)
echo      - Generates an installable .apk file.
echo      - Perfect for sharing directly with society members for testing.
echo.
echo  [2] Build Android App Bundle (Production Profile for Play Store)
echo      - Generates a .aab package.
echo      - Ready for upload to Google Play Console.
echo.
echo  [3] Build iOS App (EAS Build)
echo      - Triggers EAS build process for iOS devices.
echo.
echo  [4] Export Web Static Bundle (HTML/JS build in /dist)
echo      - Builds optimized static pages into the "/dist" directory.
echo      - Can be hosted on GitHub Pages, Netlify, or Vercel.
echo.
echo  [5] Publish Over-The-Air Update (EAS OTA Hotfix)
echo      - Instantly pushes code updates (like our avatar/settings fixes)
echo        directly to users who already have the app installed.
echo      - Bypasses rebuild and re-installation.
echo.
echo  [6] Exit Deployment Panel
echo.
echo =====================================================================
set /p choice="Enter your selection (1-6): "

if "%choice%"=="1" goto build_apk
if "%choice%"=="2" goto build_aab
if "%choice%"=="3" goto build_ios
if "%choice%"=="4" goto build_web
if "%choice%"=="5" goto ota_update
if "%choice%"=="6" goto exit
goto menu

:build_apk
cls
echo =====================================================================
echo  [1] Building Android APK (Preview Profile)...
echo =====================================================================
echo.
echo  Ensure you have EAS CLI installed globally: "npm install -g eas-cli"
echo  and are logged in: "npx eas login"
echo.
call npm run build_android
echo.
echo Press any key to return to menu...
pause >nul
goto menu

:build_aab
cls
echo =====================================================================
echo  [2] Building Android App Bundle (Production Profile)...
echo =====================================================================
echo.
echo  Ensure you have EAS CLI installed globally: "npm install -g eas-cli"
echo  and are logged in: "npx eas login"
echo.
call npm run build_android_production
echo.
echo Press any key to return to menu...
pause >nul
goto menu

:build_ios
cls
echo =====================================================================
echo  [3] Building iOS App (EAS Build)...
echo =====================================================================
echo.
echo  Ensure you have EAS CLI installed globally: "npm install -g eas-cli"
echo  and are logged in: "npx eas login"
echo.
call npm run build_ios
echo.
echo Press any key to return to menu...
pause >nul
goto menu

:build_web
cls
echo =====================================================================
echo  [4] Exporting Web Static Bundle...
echo =====================================================================
echo.
call npm run build_web
echo.
echo  Build completed! Optimized files are placed in "/dist".
echo  You can preview this build locally using: "npx serve dist -s"
echo.
echo Press any key to return to menu...
pause >nul
goto menu

:ota_update
cls
echo =====================================================================
echo  [5] Publishing Over-The-Air Update (EAS Update)...
echo =====================================================================
echo.
echo  This will push the latest JS code directly to devices.
echo  Ensure you have configured eas updates in app.json.
echo.
set /p update_msg="Enter update message (e.g. 'Fix avatar uploads'): "
if "%update_msg%"=="" set update_msg="Hotfix deployment"
echo.
echo  Running: npx eas update --auto --message "%update_msg%"
call npx eas update --auto --message "%update_msg%"
echo.
echo Press any key to return to menu...
pause >nul
goto menu

:exit
cls
echo.
echo Thank you for using SocietySync Deployment Panel. Good luck with the testing!
echo.
pause
exit
