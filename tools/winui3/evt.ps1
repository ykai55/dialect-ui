$ErrorActionPreference='Continue'
Write-Output "=== Application log, last 15 min ==="
Get-WinEvent -FilterHashtable @{LogName='Application'; StartTime=(Get-Date).AddMinutes(-15)} -ErrorAction SilentlyContinue |
  Where-Object { $_.Message -match 'GalleryProbe|dotnet' -or $_.ProviderName -match 'Application Error|.NET Runtime|AppModel' } |
  Select-Object -First 6 | ForEach-Object {
    Write-Output ("--- " + $_.TimeCreated + " | " + $_.ProviderName + " | id=" + $_.Id)
    Write-Output ($_.Message -split "`n" | Select-Object -First 22 | Out-String)
  }
Write-Output "=== AppModel-Runtime / TWinUI logs (last 10 min) ==="
foreach ($ln in @('Microsoft-Windows-AppModel-Runtime/Admin','Microsoft-Windows-TWinUI/Operational')) {
  Get-WinEvent -FilterHashtable @{LogName=$ln; StartTime=(Get-Date).AddMinutes(-10)} -ErrorAction SilentlyContinue |
    Select-Object -First 3 | ForEach-Object { Write-Output ("--- " + $ln + " " + $_.TimeCreated + " id=" + $_.Id + " " + (($_.Message -split "`n")[0])) }
}
