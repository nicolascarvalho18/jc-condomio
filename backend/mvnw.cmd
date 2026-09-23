@REM ----------------------------------------------------------------------------
@REM Maven Wrapper for JC Condominio
@REM ----------------------------------------------------------------------------
@echo off
setlocal
set "DIR=%~dp0"
set "MAVEN_CMD=%DIR%.maven\apache-maven-3.9.6\bin\mvn.cmd"
if not exist "%MAVEN_CMD%" (
    echo Maven binary not found at %MAVEN_CMD%
    exit /b 1
)
"%MAVEN_CMD%" %*
endlocal