@echo off
REM =========================================
REM TrackEx Agent Reset Script for Windows
REM =========================================
REM
REM This script completely resets the TrackEx Agent by:
REM 1. Removing the application data directory
REM 2. Deleting Windows Credential Manager entries
REM
REM Use this when:
REM - Authentication issues persist after reinstall
REM - Version mismatch errors occur
REM - Clean start is needed for troubleshooting
REM
REM Usage: Double-click reset-trackex.bat or run from command prompt
REM

echo =========================================
echo   TrackEx Agent Reset Script for Windows
echo =========================================
echo.

echo This will reset TrackEx Agent by:
echo   * Removing application data (%%APPDATA%%\TrackEx)
echo   * Deleting credential entries from Windows Credential Manager
echo.

set /p CONFIRM="Are you sure you want to continue? (Y/N) "
if /i not "%CONFIRM%"=="Y" (
    echo Aborted.
    pause
    exit /b 0
)

echo.
echo Resetting TrackEx Agent...
echo.

REM Step 1: Remove application data directory
echo ^> Removing application data...
if exist "%APPDATA%\TrackEx" (
    rmdir /s /q "%APPDATA%\TrackEx"
    echo   [OK] Application data removed: %APPDATA%\TrackEx
) else (
    echo   [-] No application data found (already clean)
)

REM Step 2: Delete Windows Credential Manager entries
echo.
echo ^> Removing credential entries...

REM Delete device_token
cmdkey /delete:com.trackex.agent:device_token >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   [OK] Deleted credential: device_token
) else (
    echo   [-] Credential not found: device_token
)

REM Delete session_data
cmdkey /delete:com.trackex.agent:session_data >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   [OK] Deleted credential: session_data
) else (
    echo   [-] Credential not found: session_data
)

REM Delete server_url
cmdkey /delete:com.trackex.agent:server_url >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   [OK] Deleted credential: server_url
) else (
    echo   [-] Credential not found: server_url
)

REM Delete app_version
cmdkey /delete:com.trackex.agent:app_version >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   [OK] Deleted credential: app_version
) else (
    echo   [-] Credential not found: app_version
)

echo.
echo =========================================
echo   TrackEx Agent has been reset!
echo =========================================
echo.
echo Next steps:
echo   1. Restart the TrackEx Agent application
echo   2. Sign in with your credentials
echo.
echo If you continue to experience issues, please contact support.
echo.
pause

