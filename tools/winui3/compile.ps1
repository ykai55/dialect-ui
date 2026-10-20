$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $csc /nologo /out:C:\probe\winui3\capture.exe C:\probe\winui3\capture.cs
Write-Output ("compile exit=" + $LASTEXITCODE + " exists=" + (Test-Path 'C:\probe\winui3\capture.exe'))
