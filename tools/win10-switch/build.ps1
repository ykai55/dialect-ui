$ErrorActionPreference = 'Stop'
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $csc /nologo /out:C:\probe\win10switch\capture.exe /r:System.Drawing.dll C:\probe\win10switch\capture.cs 2>&1 | Out-String
& $csc /nologo /out:C:\probe\win10switch\winenum.exe C:\probe\win10switch\winenum.cs 2>&1 | Out-String
Get-ChildItem C:\probe\win10switch\*.exe | ForEach-Object { Write-Output ("built " + $_.Name + " " + $_.Length) }
