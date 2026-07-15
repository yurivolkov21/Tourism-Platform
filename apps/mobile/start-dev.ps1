# Expo dev loop launcher — auto-detects the Wi-Fi IPv4 so the Metro QR never
# advertises a dead adapter's 169.254.x.x address (the classic Expo Go blue
# screen "Failed to download remote update"; see CHANGELOG 2026-07-15).
# Usage (from apps/mobile):  ./start-dev.ps1 [--clear] [any expo args]
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi |
  Where-Object PrefixOrigin -eq 'Dhcp' |
  Select-Object -First 1).IPAddress
if (-not $ip) {
  Write-Error 'No Wi-Fi IPv4 found - connect to Wi-Fi first.'
  exit 1
}
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $ip
Write-Host "Metro QR host: $ip (phone must be on the same Wi-Fi)"
pnpm exec expo start @args
