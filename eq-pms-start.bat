@echo off
set PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;%ProgramFiles%\nodejs
cd /d "%~dp0"

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] node.exe를 찾을 수 없습니다.
    echo Node.js 설치 경로를 이 파일 상단 PATH에 추가하세요.
    pause
    exit /b 1
)

echo EQ-PMS 서버 시작 (포트 8080)...
node server.js
