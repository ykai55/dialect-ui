$ErrorActionPreference = 'Continue'
$out = @()
function Say($s) { Write-Output $s }

Say "=== PS ==="
Say $PSVersionTable.PSVersion.ToString()
Say "=== OS ==="
Say (Get-CimInstance Win32_OperatingSystem).Caption
$cv = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
Say ("{0} {1}.{2}" -f $cv.ProductName, $cv.CurrentBuild, $cv.UBR)
Say "=== Sessions/quota ==="
Say (cmd /c "quser 2>&1")
Say "=== WindowsAppRuntime framework packages ==="
Get-AppxPackage -AllUsers -Name '*WindowsAppRuntime*' | ForEach-Object {
    $exists = Test-Path (Join-Path $_.InstallLocation 'Microsoft.UI.Xaml.dll')
    Say ("{0} | {1} | {2} | xaml={3} | {4}" -f $_.Name, $_.Version, $_.Architecture, $exists, $_.InstallLocation)
}
Say "=== packages depending on WindowsAppRuntime ==="
$pkgs = Get-AppxPackage -AllUsers
foreach ($p in $pkgs) {
    $deps = @($p.Dependencies | Where-Object { $_.Name -like '*WindowsAppRuntime*' })
    if ($deps.Count -gt 0) {
        Say ("PKG {0} | {1} | {2}" -f $p.Name, $p.Version, $p.InstallLocation)
        foreach ($d in $deps) { Say ("   dep: {0} {1}" -f $d.Name, $d.Version) }
        if ($p.InstallLocation) {
            $xl = Join-Path $p.InstallLocation 'Microsoft.UI.Xaml.dll'
            Say ("   Microsoft.UI.Xaml.dll in pkg: {0}" -f (Test-Path $xl))
            if (Test-Path $xl) {
                $vi = (Get-Item $xl).VersionInfo
                Say ("   dll version: {0} / {1}" -f $vi.FileVersion, $vi.ProductVersion)
            }
            $exes = Get-ChildItem $p.InstallLocation -Filter *.exe -ErrorAction SilentlyContinue | Select-Object -First 15
            foreach ($e in $exes) { Say ("   exe: {0}" -f $e.Name) }
        }
    }
}
Say "=== any package folder containing Microsoft.UI.Xaml.dll ==="
foreach ($p in $pkgs) {
    if (-not $p.InstallLocation) { continue }
    $xl = Join-Path $p.InstallLocation 'Microsoft.UI.Xaml.dll'
    if (Test-Path $xl) {
        $vi = (Get-Item $xl).VersionInfo
        Say ("HASXAML {0} | {1} | {2} | {3}" -f $p.Name, $p.Version, $vi.FileVersion, $p.InstallLocation)
    }
}
Say "=== unpackaged candidates in Program Files ==="
foreach ($root in @('C:\Program Files', 'C:\Program Files (x86)', 'C:\Users\Administrator\AppData\Local')) {
    Get-ChildItem $root -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        foreach ($f in @('Microsoft.UI.Xaml.dll', 'Microsoft.WindowsAppRuntime.Bootstrap.dll', 'WinUI3Gallery.exe', 'WinUI3GalleryApp.exe')) {
            $cand = Join-Path $_.FullName $f
            if (Test-Path $cand) { Say ("UNPKG {0} | {1}" -f $cand, (Get-Item $cand).VersionInfo.FileVersion) }
        }
    }
}
Say "=== done ==="
