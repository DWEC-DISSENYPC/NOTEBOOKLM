@echo off
title Iniciando NotebookLM Desktop...
cd /d "%~dp0"
if exist "dist\NotebookLMDesktop-win32-x64\NotebookLMDesktop.exe" (
    start "" "dist\NotebookLMDesktop-win32-x64\NotebookLMDesktop.exe"
) else (
    start "" /min npm start
)
exit
