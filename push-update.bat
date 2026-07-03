@echo off
echo ========================================
echo   Taiyari NEET Ki - Push OTA Update
echo ========================================
echo.

set /p MSG="Update message (what changed?): "

echo.
echo Pushing update to all users...
echo.

cd /d C:\Users\HP\Tyari-neet-ios
npx eas-cli update --channel preview --message "%MSG%" --non-interactive

echo.
echo ========================================
echo   UPDATE PUSHED! Users will get it
echo   next time they open the app.
echo ========================================
echo.
pause
