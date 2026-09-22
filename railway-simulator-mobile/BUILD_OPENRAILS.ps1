$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path
$Engine=Join-Path $Root 'engine\openrails'
if(-not (Test-Path $Engine)){ git clone --depth 1 https://github.com/openrails/openrails.git $Engine }
Set-Location $Engine
if(Test-Path '.\Build.cmd'){ cmd /c .\Build.cmd }
Write-Host 'Open Rails engine build completed. Add licensed Northern Railway content under content\NorthernRailway.'
