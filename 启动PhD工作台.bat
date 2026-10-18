@echo off
chcp 65001 >nul
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0"
