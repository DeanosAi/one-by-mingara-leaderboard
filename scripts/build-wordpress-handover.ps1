param(
  [string]$Version = '1.0.0'
)

$ErrorActionPreference = 'Stop'
$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$handoverRoot = [System.IO.Path]::GetFullPath((Join-Path $workspace "handover\One-by-Mingara-WordPress-Handover-v$Version"))
$expectedPrefix = $workspace.TrimEnd('\') + '\handover\'

if (-not $handoverRoot.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to write outside the workspace handover directory: $handoverRoot"
}

Push-Location $workspace
try {
  npm run build:wordpress
  if ($LASTEXITCODE -ne 0) { throw 'The WordPress frontend build failed.' }

  Copy-Item -LiteralPath 'public\one-by-mingara-logo.png' -Destination 'wordpress\one-by-mingara-leaderboard\assets\one-by-mingara-logo.png' -Force

  if (Test-Path -LiteralPath $handoverRoot) {
    Remove-Item -LiteralPath $handoverRoot -Recurse -Force
  }
  New-Item -ItemType Directory -Path $handoverRoot -Force | Out-Null

  $pluginZip = Join-Path $handoverRoot 'one-by-mingara-leaderboard.zip'
  & tar.exe -a -c -f $pluginZip -C 'wordpress' 'one-by-mingara-leaderboard'
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the WordPress plugin ZIP.' }

  $sourcePaths = @(
    '.dockerignore',
    '.env.example',
    '.gitignore',
    'Dockerfile',
    'index.html',
    'package.json',
    'package-lock.json',
    'README.md',
    'MINGARA-WORDPRESS-DEPLOYMENT-GUIDE.md',
    'WORDPRESS-HANDOVER-README.txt',
    'vite.config.js',
    'vite.wordpress.config.js',
    'public',
    'server',
    'shared',
    'scripts',
    'src',
    'test',
    'wordpress'
  )
  $sourceZip = Join-Path $handoverRoot "one-by-mingara-leaderboard-source-v$Version.zip"
  & tar.exe -a -c -f $sourceZip @sourcePaths
  if ($LASTEXITCODE -ne 0) { throw 'Could not create the source ZIP.' }

  Copy-Item -LiteralPath 'MINGARA-WORDPRESS-DEPLOYMENT-GUIDE.md' -Destination (Join-Path $handoverRoot 'MINGARA-WORDPRESS-DEPLOYMENT-GUIDE.md')
  Copy-Item -LiteralPath 'WORDPRESS-HANDOVER-README.txt' -Destination (Join-Path $handoverRoot 'README-FIRST.txt')

  $hashLines = Get-ChildItem -LiteralPath $handoverRoot -File |
    Where-Object { $_.Name -ne 'SHA256SUMS.txt' } |
    Sort-Object Name |
    ForEach-Object {
      $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName
      "$($hash.Hash.ToLowerInvariant())  $($_.Name)"
    }
  [System.IO.File]::WriteAllLines((Join-Path $handoverRoot 'SHA256SUMS.txt'), $hashLines, [System.Text.UTF8Encoding]::new($false))

  Write-Host "Handover created at $handoverRoot"
} finally {
  Pop-Location
}
