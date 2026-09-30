@echo off
cd /d "C:\Users\Vikranth Reddy\Downloads\Construct3_Project\construct3_remake\backend"
"C:\Users\Vikranth Reddy\Downloads\Construct3_Project\construct3_remake\.venv\Scripts\uvicorn.exe" main:app --host 0.0.0.0 --port 8000