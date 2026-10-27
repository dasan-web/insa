@echo off
chcp 65001 > nul
title 다산 인사정보시스템 (HRMS) - 종료

echo ========================================================
echo       다산 인사정보시스템 (HRMS) 서버 종료
echo ========================================================
echo.
echo 3001번 포트 프로세스 종료 중...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1
echo 완료되었습니다.
echo.
pause
