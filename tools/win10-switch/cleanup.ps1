$ErrorActionPreference = 'Continue'
Write-Output "=== schtasks matching w10sw ==="
& schtasks.exe /Query /FO CSV /NH 2>$null | ForEach-Object { if ($_ -match '"(w10sw[^"]*)"') { Write-Output ("leftover task: " + $matches[1]); & schtasks.exe /Delete /TN $matches[1] /F 2>&1 | Out-String | Write-Output } }
$sess = 2
Get-Process SystemSettings,CalculatorApp,SecHealthUI,Time,ApplicationFrameHost -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $sess } | ForEach-Object {
  Write-Output ("stopping " + $_.ProcessName + " pid=" + $_.Id + " sess=" + $_.SessionId)
  Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1
Get-Process SystemSettings,CalculatorApp,SecHealthUI,Time -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("left: " + $_.ProcessName + " pid=" + $_.Id + " sess=" + $_.SessionId) }
$theme = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize'
Write-Output ("AppsUseLightTheme=" + $theme.AppsUseLightTheme + " SystemUsesLightTheme=" + $theme.SystemUsesLightTheme)
Write-Output "CLEANUP_DONE"
