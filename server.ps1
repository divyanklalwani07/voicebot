# ==============================================================================
# VoxAI Studio — Native Windows PowerShell HTTP Server
# Zero-dependency, runs out of the box on any Windows PC without Node.js
# ==============================================================================

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Port = 3000
$Prefix = "http://localhost:$Port/"

# Load .env if present
$EnvFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and !$line.StartsWith('#') -and $line.Contains('=')) {
            $parts = $line.Split('=', 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            if (![Environment]::GetEnvironmentVariable($k)) {
                [Environment]::SetEnvironmentVariable($k, $v, "Process")
            }
        }
    }
}

$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Prefix)

try {
    $Listener.Start()
} catch {
    Write-Host "[!] Port $Port is already in use (possibly by Node.js server)." -ForegroundColor Yellow
    Write-Host "[*] If Node.js is already running, open http://localhost:$Port in your browser." -ForegroundColor Cyan
    exit 0
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "🎙️  VoxAI Studio PowerShell Server listening on $Prefix" -ForegroundColor Green
Write-Host "🔒  Security Mode: Backend Proxy Active" -ForegroundColor Magenta
$key = [Environment]::GetEnvironmentVariable("ELEVENLABS_API_KEY")
$hasKey = ($key -and $key.Length -gt 10 -and !$key.Contains("your_"))
Write-Host "🔑  ElevenLabs API Key: $(if ($hasKey) {'Configured ✅'} else {'Not Set (Free Preview Active) ⚠️'})" -ForegroundColor $(if ($hasKey) {'Green'} else {'Yellow'})
Write-Host "================================================================" -ForegroundColor Cyan

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".mp3"  = "audio/mpeg"
    ".wav"  = "audio/wav"
}

# Cache for voices
$CachedVoices = $null
$LastVoicesFetch = [DateTime]::MinValue

while ($Listener.IsListening) {
    try {
        $Context = $Listener.GetContext()
        $Request = $Context.Request
        $Response = $Context.Response

        $Response.Headers.Add("Access-Control-Allow-Origin", "*")
        $Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, xi-api-key")

        if ($Request.HttpMethod -eq "OPTIONS") {
            $Response.StatusCode = 204
            $Response.Close()
            continue
        }

        $RawPath = $Request.Url.AbsolutePath

        # /api/status
        if ($RawPath -eq "/api/status" -and $Request.HttpMethod -eq "GET") {
            $currentKey = [Environment]::GetEnvironmentVariable("ELEVENLABS_API_KEY")
            $configured = ($currentKey -and $currentKey.Length -gt 10 -and !$currentKey.Contains("your_"))
            $masked = if ($configured) { $currentKey.Substring(0, 4) + "••••••••" + $currentKey.Substring($currentKey.Length - 4) } else { "" }
            
            $statusObj = @{
                status = "online"
                appName = "VoxAI Studio"
                version = "2.5.0-ps"
                apiKeyConfigured = $configured
                maskedKey = $masked
                mode = if ($configured) { "production_live" } else { "configuration_needed" }
                defaultModel = "eleven_multilingual_v2"
                timestamp = (Get-Date).ToString("o")
            }
            $jsonBytes = [Text.Encoding]::UTF8.GetBytes(($statusObj | ConvertTo-Json))
            $Response.ContentType = "application/json"
            $Response.OutputStream.Write($jsonBytes, 0, $jsonBytes.Length)
            $Response.Close()
            continue
        }

        # /api/voices
        if ($RawPath -eq "/api/voices" -and $Request.HttpMethod -eq "GET") {
            $now = Get-Date
            if ($CachedVoices -and ($now - $LastVoicesFetch).TotalMinutes -lt 10) {
                $jsonBytes = [Text.Encoding]::UTF8.GetBytes(($CachedVoices | ConvertTo-Json -Depth 5))
                $Response.ContentType = "application/json"
                $Response.OutputStream.Write($jsonBytes, 0, $jsonBytes.Length)
                $Response.Close()
                continue
            }

            try {
                $vResp = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/voices" -Method Get -TimeoutSec 5
                $rawList = $vResp.voices
                $norm = @($rawList | ForEach-Object {
                    $labels = $_.labels
                    @{
                        voice_id = $_.voice_id
                        name = $_.name
                        category = $_.category
                        gender = if ($labels.gender) { $labels.gender } else { "Voice" }
                        accent = if ($labels.accent) { $labels.accent } else { "Neutral" }
                        age = if ($labels.age) { $labels.age } else { "" }
                        use_case = if ($labels.'use case') { $labels.'use case' } else { "General" }
                        description = if ($_.description) { $_.description } else { "Natural AI Narration Voice" }
                        preview_url = if ($_.preview_url) { $_.preview_url } else { "" }
                    }
                })
                $CachedVoices = @{ voices = $norm; source = "live_public"; apiKeyConfigured = $hasKey }
                $LastVoicesFetch = $now
                $jsonBytes = [Text.Encoding]::UTF8.GetBytes(($CachedVoices | ConvertTo-Json -Depth 5))
            } catch {
                $CachedVoices = @{ voices = @(); source = "offline_empty"; apiKeyConfigured = $hasKey }
                $jsonBytes = [Text.Encoding]::UTF8.GetBytes(($CachedVoices | ConvertTo-Json))
            }

            $Response.ContentType = "application/json"
            $Response.OutputStream.Write($jsonBytes, 0, $jsonBytes.Length)
            $Response.Close()
            continue
        }

        # /api/set-key
        if ($RawPath -eq "/api/set-key" -and $Request.HttpMethod -eq "POST") {
            $reader = New-Object IO.StreamReader($Request.InputStream)
            $bodyText = $reader.ReadToEnd()
            $body = $bodyText | ConvertFrom-Json

            if ($body.action -eq "disconnect" -or $body.apiKey -eq "") {
                [Environment]::SetEnvironmentVariable("ELEVENLABS_API_KEY", "", "Process")
                $Response.ContentType = "application/json"
                $respBytes = [Text.Encoding]::UTF8.GetBytes('{"success":true,"apiKeyConfigured":false}')
                $Response.OutputStream.Write($respBytes, 0, $respBytes.Length)
                $Response.Close()
                continue
            }

            $cleanKey = $body.apiKey.Trim()
            [Environment]::SetEnvironmentVariable("ELEVENLABS_API_KEY", $cleanKey, "Process")
            $Response.ContentType = "application/json"
            $respBytes = [Text.Encoding]::UTF8.GetBytes('{"success":true,"apiKeyConfigured":true}')
            $Response.OutputStream.Write($respBytes, 0, $respBytes.Length)
            $Response.Close()
            continue
        }

        # /api/generate-speech
        if ($RawPath -eq "/api/generate-speech" -and $Request.HttpMethod -eq "POST") {
            $currentKey = [Environment]::GetEnvironmentVariable("ELEVENLABS_API_KEY")
            $configured = ($currentKey -and $currentKey.Length -gt 10 -and !$currentKey.Contains("your_"))

            $reader = New-Object IO.StreamReader($Request.InputStream)
            $bodyText = $reader.ReadToEnd()
            $body = $bodyText | ConvertFrom-Json

            if (!$configured) {
                # Generate synthetic melody WAV demo
                $textLen = if ($body.text) { $body.text.Length } else { 20 }
                $sampleRate = 22050
                $dur = [Math]::Min([Math]::Max(2, [int]($textLen / 20)), 6)
                $numSamples = $sampleRate * $dur
                $wavStream = New-Object IO.MemoryStream
                $w = New-Object IO.BinaryWriter($wavStream)

                $w.Write([Text.Encoding]::ASCII.GetBytes("RIFF"))
                $w.Write([int](36 + $numSamples * 2))
                $w.Write([Text.Encoding]::ASCII.GetBytes("WAVE"))
                $w.Write([Text.Encoding]::ASCII.GetBytes("fmt "))
                $w.Write([int]16)
                $w.Write([short]1)
                $w.Write([short]1)
                $w.Write([int]$sampleRate)
                $w.Write([int]($sampleRate * 2))
                $w.Write([short]2)
                $w.Write([short]16)
                $w.Write([Text.Encoding]::ASCII.GetBytes("data"))
                $w.Write([int]($numSamples * 2))

                for ($i = 0; $i -lt $numSamples; $i++) {
                    $t = $i / $sampleRate
                    $env = [Math]::Sin(([Math]::PI * $t) / $dur)
                    $f1 = 220 + 40 * [Math]::Sin(2 * [Math]::PI * 1.5 * $t)
                    $val = [Math]::Sin(2 * [Math]::PI * $f1 * $t) * $env
                    $sample = [short]($val * 16000)
                    $w.Write($sample)
                }
                $w.Flush()
                $demoBytes = $wavStream.ToArray()

                $Response.StatusCode = 200
                $Response.ContentType = "audio/wav"
                $Response.Headers.Add("X-VoxAI-Status", "demo-synthesized")
                $Response.OutputStream.Write($demoBytes, 0, $demoBytes.Length)
                $Response.Close()
                continue
            }

            # Forward to ElevenLabs
            $vId = if ($body.voice_id) { $body.voice_id } else { "JBFqnCBsd6RMkjVDRZzb" }
            $mId = if ($body.model_id) { $body.model_id } else { "eleven_multilingual_v2" }
            $ttsUrl = "https://api.elevenlabs.io/v1/text-to-speech/$vId?output_format=mp3_44100_128"
            
            $payload = @{
                text = $body.text
                model_id = $mId
                voice_settings = @{
                    stability = 0.5
                    similarity_boost = 0.75
                }
            } | ConvertTo-Json

            try {
                $upstream = Invoke-WebRequest -Uri $ttsUrl -Method Post -Headers @{ "xi-api-key" = $currentKey; "Accept" = "audio/mpeg" } -Body $payload -ContentType "application/json"
                $Response.StatusCode = 200
                $Response.ContentType = "audio/mpeg"
                $Response.Headers.Add("X-VoxAI-Status", "synthesized-live")
                $Response.OutputStream.Write($upstream.Content, 0, $upstream.Content.Length)
            } catch {
                $Response.StatusCode = 502
                $Response.ContentType = "application/json"
                $errBytes = [Text.Encoding]::UTF8.GetBytes('{"error":"ElevenLabs upstream error"}')
                $Response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $Response.Close()
            continue
        }

        # Static file handling
        $LocalFile = if ($RawPath -eq "/") { "index.html" } else { $RawPath.TrimStart('/') }
        $SafePath = Join-Path $PSScriptRoot $LocalFile

        if (Test-Path $SafePath -PathType Leaf) {
            $ext = [IO.Path]::GetExtension($SafePath).ToLower()
            $mime = if ($MimeTypes.ContainsKey($ext)) { $MimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [IO.File]::ReadAllBytes($SafePath)
            $Response.StatusCode = 200
            $Response.ContentType = $mime
            $Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $Response.StatusCode = 404
            $bytes = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $Response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
        $Response.Close()
    } catch {
        # ignore client disconnects
    }
}
