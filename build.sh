#!/bin/bash
# SocietySync Production Build Tool (Git Bash / WSL)

clear
echo "==================================================="
echo "  SOCIETYSYNC PRODUCTION BUILD TOOL (BASH)"
echo "==================================================="
echo ""
echo "Please select a build option:"
echo ""
echo "1) Build Android App (Preview APK) - EAS"
echo "2) Build Android App (Production AAB) - EAS"
echo "3) Build iOS App (Production) - EAS"
echo "4) Export Mobile Web App (Static Assets)"
echo "5) Build Admin Portal (Next.js Production)"
echo "6) Build All Web Components (Mobile Web + Portal)"
echo "7) Exit"
echo ""
read -p "Enter choice (1-7): " opt

case $opt in
  1)
    echo ""
    echo "Running EAS Build Android (Preview)..."
    npm run build_android
    ;;
  2)
    echo ""
    echo "Running EAS Build Android (Production)..."
    npm run build_android_production
    ;;
  3)
    echo ""
    echo "Running EAS Build iOS..."
    npm run build_ios
    ;;
  4)
    echo ""
    echo "Exporting Mobile Web App static assets..."
    npm run build_web
    ;;
  5)
    echo ""
    echo "Building Admin Portal for production..."
    npm run portal:build
    ;;
  6)
    echo ""
    echo "Building all web and portal assets..."
    npm run build_web
    npm run portal:build
    ;;
  7)
    echo "Exiting..."
    exit 0
    ;;
  *)
    echo "Invalid option selected."
    ;;
esac

echo ""
read -n 1 -s -r -p "Build process finished. Press any key to exit."
echo ""
