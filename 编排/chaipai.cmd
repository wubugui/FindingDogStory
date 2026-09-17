@echo off
rem chaipai: read-only CLI for the planning page. Usage: chaipai.cmd <command>  (see --help)
rem Node lookup order: CHAIPAI_NODE -> node on PATH -> GameDraft bundled node. Fails loudly.
setlocal
set "HERE=%~dp0"
set "NODE="
if defined CHAIPAI_NODE set "NODE=%CHAIPAI_NODE%"
if not defined NODE (
  where node >nul 2>nul
  if not errorlevel 1 set "NODE=node"
)
if not defined NODE (
  for /d %%D in ("%HERE%..\..\GameDraft\.tools\node\node-*") do (
    if exist "%%~fD\node.exe" set "NODE=%%~fD\node.exe"
  )
)
if not defined NODE (
  echo [chaipai] node not found: install Node 18+ or set CHAIPAI_NODE 1>&2
  exit /b 127
)
chcp 65001 >nul
"%NODE%" "%HERE%chaipai.cjs" %*
exit /b %errorlevel%
