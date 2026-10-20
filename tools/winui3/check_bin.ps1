$bin = 'C:\probe\winui3\gallery\bin'
Write-Output ("file count = " + (Get-ChildItem $bin).Count)
foreach ($f in @('Microsoft.UI.Xaml.Controls.dll','Microsoft.WindowsAppRuntime.dll','Microsoft.ui.xaml.resources.19h1.dll','Microsoft.ui.xaml.resources.common.dll','CoreMessagingXP.dll','dcompi.dll','Microsoft.UI.Windowing.Core.dll','Microsoft.UI.Composition.OSSupport.dll','Microsoft.WindowsAppRuntime.Bootstrap.dll','WinUIEdit.dll','Microsoft.UI.dll')) {
    Write-Output ("$f = " + (Test-Path (Join-Path $bin $f)))
}
Write-Output "=== largest files ==="
Get-ChildItem $bin | Sort-Object Length -Descending | Select-Object -First 12 | ForEach-Object { Write-Output ("  " + $_.Name + " " + $_.Length) }
