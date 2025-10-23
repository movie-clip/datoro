@echo off
REM AI Insights Tool - Launcher Script (Windows CMD)
echo.
echo Starting AI Insights Tool...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    exit /b 1
)

REM Check if Streamlit is installed
if not exist "venv\Scripts\streamlit.exe" (
    echo ERROR: Streamlit not installed!
    echo Please run: venv\Scripts\pip.exe install -r requirements.txt
    exit /b 1
)

REM Activate virtual environment and run Streamlit
echo Virtual environment found
echo Launching Streamlit app...
echo.

call venv\Scripts\activate.bat
streamlit run app.py --server.headless true
