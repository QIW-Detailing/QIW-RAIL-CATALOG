# Lightweight Static Web Server in PowerShell
$port = 8083
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "QIW RAIL CATALOG local server started successfully!"
    Write-Host "Open your browser and navigate to: http://localhost:$port/"
    Write-Host "Press Ctrl+C in the terminal to stop the server."
} catch {
    Write-Host "Error: Failed to start listener. Is port $port already in use?"
    Exit
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath

        if ($path -eq "/log") {
            $msg = $request.QueryString["msg"]
            if ($msg) {
                Write-Host "LOG: $msg"
                Add-Content -Path "debug.log" -Value $msg
            }
            $response.StatusCode = 200
            $okBytes = [System.Text.Encoding]::UTF8.GetBytes("ok")
            $response.OutputStream.Write($okBytes, 0, $okBytes.Length)
            $response.Close()
            continue
        }



        if ($path -eq "/" -or $path -eq "") {
            $path = "/index.html"
        }
        
        # Clean path to prevent directory traversal
        $cleanPath = $path.Replace("..", "").TrimStart('/')
        $filePath = Join-Path (Get-Location) $cleanPath
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css" }
                ".js"   { "application/javascript" }
                ".svg"  { "image/svg+xml" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".json" { "application/json" }
                default { "application/octet-stream" }
            }
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            $response.Headers.Add("Pragma", "no-cache")
            $response.Headers.Add("Expires", "0")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    } catch {
        # Silent ignore connection drops/cancels
    }
}
