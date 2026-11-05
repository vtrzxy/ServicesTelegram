@echo off
cd /d "%~dp0"
py -3 agent.py --config agent.json
pause
