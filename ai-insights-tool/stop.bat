@echo off
REM AI Insights Tool - Stop Script
REM Forcefully stops all Streamlit and Python processes

echo Stopping AI Insights Tool...
echo.

taskkill /F /IM streamlit.exe 2>nul
taskkill /F /IM python.exe 2>nul

echo.
echo All processes stopped.
echo.

pause
