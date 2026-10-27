@echo off
chcp 65001 > nul
title 다산 인사정보시스템 (HRMS)

echo ========================================================
echo       다산 인사정보시스템 (HRMS) 개발 서버 시작
echo ========================================================
echo.
echo [1/3] 기존 3001번 포트 잔류 프로세스 정리 중...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a > nul 2>&1

echo [2/3] MariaDB 데이터베이스 서비스 확인 중...
net start MariaDB > nul 2>&1
net start MySQL > nul 2>&1

echo [3/3] 브라우저 자동 실행 및 개발 서버 시작...
echo.
echo 접속 주소: http://localhost:3001
echo * 잠시 후 웹 브라우저가 자동으로 열립니다.
echo * 서버를 계속 사용하려면 이 콘솔 창을 닫지 마세요.
echo * 서버를 종료하려면 stop.bat을 실행하거나 이 창을 닫으세요.
echo --------------------------------------------------------
echo.
start http://localhost:3001

npm run dev
pause
