@echo off
REM ==================================================
REM Backup toàn bộ MongoDB Atlas + Backend + Frontend
REM ==================================================

REM --- Cấu hình đường dẫn ---
set BACKUP_ROOT=D:\Backup\MERN
set TIMESTAMP=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set LOG_FILE=%BACKUP_ROOT%\backup_log.txt

REM --- Cấu hình MongoDB URI ---
set MONGO_URI="mongodb+srv://thang2401204:Thang2414@dbweb.diprfhc.mongodb.net/MERN?retryWrites=true&w=majority"

REM --- Đường dẫn backend & frontend ---
set BACKEND_PATH=D:\baitaplonweb\backend
set FRONTEND_PATH=D:\baitaplonweb\frontend

echo ======================================= >> %LOG_FILE%
echo Backup started at %TIMESTAMP% >> %LOG_FILE%
echo ======================================= >> %LOG_FILE%

REM --- Backup MongoDB ---
echo Backing up MongoDB Atlas...
mkdir "%BACKUP_ROOT%\mongo\%TIMESTAMP%" >nul 2>&1
mongodump --uri %MONGO_URI% --out "%BACKUP_ROOT%\mongo\%TIMESTAMP%" >> %LOG_FILE% 2>&1
if %ERRORLEVEL% equ 0 (
    echo MongoDB backup successful >> %LOG_FILE%
) else (
    echo MongoDB backup FAILED >> %LOG_FILE%
)

REM --- Backup backend ---
echo Backing up backend...
mkdir "%BACKUP_ROOT%\backend\%TIMESTAMP%" >nul 2>&1
xcopy "%BACKEND_PATH%" "%BACKUP_ROOT%\backend\%TIMESTAMP%\" /E /I /Q /Y >> %LOG_FILE% 2>&1
echo Backend backup completed >> %LOG_FILE%

REM --- Backup frontend ---
echo Backing up frontend...
mkdir "%BACKUP_ROOT%\frontend\%TIMESTAMP%" >nul 2>&1
xcopy "%FRONTEND_PATH%" "%BACKUP_ROOT%\frontend\%TIMESTAMP%\" /E /I /Q /Y >> %LOG_FILE% 2>&1
echo Frontend backup completed >> %LOG_FILE%

echo ======================================= >> %LOG_FILE%
echo Backup finished at %TIME% >> %LOG_FILE%
echo ======================================= >> %LOG_FILE%

echo Backup completed! Check log at %LOG_FILE%
pause
