param(
    [Parameter(Mandatory = $true)][string]$Installer,
    [Parameter(Mandatory = $true)][string]$ExpectedVersion
)

$ErrorActionPreference = 'Stop'
$baselineVersion = '0.4.1'
$baselineUrl = 'https://github.com/focustap/LaneLite/releases/download/v0.4.1/LaneLite_0.4.1_x64-setup.exe'
$baselineSha256 = '519aa4830497484ad8b191f22f1157ed58269ceb5b1c2a39e2d16de96295b10e'
$baselineInstaller = Join-Path $env:RUNNER_TEMP 'LaneLite-upgrade-baseline.exe'
$installDirectory = Join-Path $env:LOCALAPPDATA 'LaneLite-Upgrade-Verification'
$registryRoots = @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKCU:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
    'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
)

function Get-LaneLiteInstallations {
    foreach ($root in $registryRoots) {
        if (Test-Path $root) {
            Get-ChildItem $root | ForEach-Object {
                $entry = Get-ItemProperty $_.PSPath
                if ($entry.DisplayName -eq 'LaneLite') { $entry }
            }
        }
    }
}

function Run-Installer([string]$File, [string[]]$Arguments) {
    $process = Start-Process -FilePath $File -ArgumentList $Arguments -PassThru
    if (-not $process.WaitForExit(180000)) {
        $process.Kill()
        throw "Installer timed out: $File"
    }
    if ($process.ExitCode -ne 0) { throw "Installer exited with code $($process.ExitCode): $File" }
}

if (@(Get-LaneLiteInstallations).Count -ne 0) { throw 'Expected a clean Windows runner before the upgrade test' }
Invoke-WebRequest -Uri $baselineUrl -OutFile $baselineInstaller
if ((Get-FileHash $baselineInstaller -Algorithm SHA256).Hash.ToLowerInvariant() -ne $baselineSha256) {
    throw 'Released baseline installer checksum does not match'
}

# An intentionally nondefault destination verifies that an upgrade discovers the
# existing installation rather than making a second copy in the default folder.
Run-Installer $baselineInstaller @('/S', "/D=$installDirectory")
$before = @(Get-LaneLiteInstallations)
if ($before.Count -ne 1 -or $before[0].DisplayVersion -ne $baselineVersion) { throw 'Baseline installation was not registered exactly once' }
$previousLocation = $before[0].InstallLocation.Trim('"')
if ($previousLocation -ne $installDirectory) { throw "Baseline did not use the requested folder: $previousLocation" }

# These are preservation markers, not fabricated WebView databases or user LP.
$markers = @()
foreach ($dataRoot in @($env:APPDATA, $env:LOCALAPPDATA)) {
    $dataDirectory = Join-Path $dataRoot 'com.lanelite.prototype'
    New-Item -ItemType Directory -Path $dataDirectory -Force | Out-Null
    $marker = Join-Path $dataDirectory 'upgrade-preservation-check.txt'
    [System.IO.File]::WriteAllText($marker, 'LaneLite existing app data must survive an installer upgrade.')
    $markers += @{ Path = $marker; Hash = (Get-FileHash $marker -Algorithm SHA256).Hash }
}

# Use the ordinary setup path, with no forced destination and no /UPDATE flag:
# this is the same installer a user double-clicks, running silently for CI.
Run-Installer (Resolve-Path $Installer).Path @('/S')
$after = @(Get-LaneLiteInstallations)
if ($after.Count -ne 1) { throw "Upgrade created $($after.Count) LaneLite entries instead of one" }
if ($after[0].PSPath -ne $before[0].PSPath) { throw 'Upgrade changed the existing uninstall registry entry' }
if ($after[0].DisplayVersion -ne $ExpectedVersion) { throw "Installed version is $($after[0].DisplayVersion), expected $ExpectedVersion" }
if ($after[0].InstallLocation.Trim('"') -ne $previousLocation) { throw 'Upgrade installed into a different folder' }
$installedExe = Join-Path $previousLocation 'lanelite.exe'
$builtExe = Join-Path $PSScriptRoot '../src-tauri/target/release/lanelite.exe'
# Tauri bundles a copy with its NSIS marker, then restores the portable binary.
# Reproduce only that documented fixed-length patch in memory; every other byte
# must match. Source: tauri-bundler/src/bundle.rs, patch_binary(PackageType::Nsis).
$expectedBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $builtExe).Path)
$marker = '__TAURI_BUNDLE_TYPE_VAR_UNK'
$offset = [System.Text.Encoding]::Latin1.GetString($expectedBytes).IndexOf($marker, [System.StringComparison]::Ordinal)
if ($offset -lt 0) { throw 'Expected Tauri bundle marker is missing from the portable binary' }
$nsisMarker = [System.Text.Encoding]::ASCII.GetBytes('__TAURI_BUNDLE_TYPE_VAR_NSS')
[System.Array]::Copy($nsisMarker, 0, $expectedBytes, $offset, $nsisMarker.Length)
$expectedHash = [System.Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($expectedBytes))
$installedHash = (Get-FileHash $installedExe -Algorithm SHA256).Hash
if ($installedHash -ne $expectedHash) {
    $installedVersion = (Get-Item $installedExe).VersionInfo.ProductVersion
    throw "Installed executable does not match the new NSIS payload (version $installedVersion; expected $expectedHash, got $installedHash)"
}
foreach ($marker in $markers) {
    if (-not (Test-Path $marker.Path)) { throw "Upgrade deleted existing app data: $($marker.Path)" }
    if ((Get-FileHash $marker.Path -Algorithm SHA256).Hash -ne $marker.Hash) { throw 'Upgrade modified existing app data' }
}

Write-Host "PASS: $baselineVersion -> $ExpectedVersion; one app entry, same custom installation folder, new executable, preserved Local/Roaming app data."
if ($env:GITHUB_STEP_SUMMARY) {
    "Windows upgrade verified: **$baselineVersion → $ExpectedVersion**, one LaneLite entry, same installation folder, new executable and preserved app-data markers." | Add-Content $env:GITHUB_STEP_SUMMARY
}
