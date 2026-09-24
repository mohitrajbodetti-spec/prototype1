# Student Budget Tracker - Smart Daily App Launcher
# If the server is already active, it simply reopens the web app in the browser.
# If the server is stopped, it starts the server silently in the background and opens the browser.
# Safe to click repeatedly anytime!

$ErrorActionPreference = "SilentlyContinue"
$projectDir = $PSScriptRoot
if (-not $projectDir) {
    $projectDir = "C:\Users\giris.MOHIT\OneDrive\Documents\project"
}

function Test-PortActive {
    param([int]$port = 3000)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $async = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $wait = $async.AsyncWaitHandle.WaitOne(600, $false)
        if ($wait -and $tcp.Connected) {
            $tcp.EndConnect($async)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
        return $false
    } catch {
        return $false
    }
}

# 1. Check if server is running on port 3000; if not, start it
if (-not (Test-PortActive 3000)) {
    $nodeExe = "agy-node"
    if (-not (Get-Command "agy-node" -ErrorAction SilentlyContinue)) {
        $nodeExe = "node"
    }

    Start-Process -FilePath $nodeExe -ArgumentList "server.js" -WorkingDirectory $projectDir -WindowStyle Hidden

    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Milliseconds 200
        if (Test-PortActive 3000) {
            break
        }
    }
}

# 2. Check if cloudflared tunnel is running; if not, start it in the background
$cfProcess = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if (-not $cfProcess -and (Test-Path "$projectDir\cloudflared.exe")) {
    Start-Process -FilePath "$projectDir\cloudflared.exe" -ArgumentList "tunnel --url http://localhost:3000" -WorkingDirectory $projectDir -WindowStyle Hidden
}

# 3. Open / focus the browser to the application
Start-Process "http://localhost:3000"
