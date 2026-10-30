param([string]$Source = (Join-Path $PSScriptRoot '../frontend/public/branding/hivet-logo.png'))

# Package the approved transparent logo into browser and installable-app sizes.
Add-Type -AssemblyName System.Drawing
$brandRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../frontend/public/branding'))
[IO.Directory]::CreateDirectory($brandRoot) | Out-Null
$image = [Drawing.Image]::FromFile([IO.Path]::GetFullPath($Source))
try {
    $outputs = @(
        @{ Name = 'favicon-16.png'; Size = 16; Scale = 1.0; Opaque = $false },
        @{ Name = 'favicon-32.png'; Size = 32; Scale = 1.0; Opaque = $false },
        @{ Name = 'icon-192.png'; Size = 192; Scale = 1.0; Opaque = $false },
        @{ Name = 'icon-512.png'; Size = 512; Scale = 1.0; Opaque = $false },
        @{ Name = 'icon-maskable-192.png'; Size = 192; Scale = 0.68; Opaque = $true },
        @{ Name = 'icon-maskable-512.png'; Size = 512; Scale = 0.68; Opaque = $true },
        @{ Name = 'apple-touch-icon.png'; Size = 180; Scale = 0.85; Opaque = $true }
    )
    foreach ($output in $outputs) {
        $bitmap = [Drawing.Bitmap]::new($output.Size, $output.Size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        try {
            if ($output.Opaque) { $graphics.Clear([Drawing.Color]::White) }
            else { $graphics.Clear([Drawing.Color]::Transparent) }
            $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
            $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $extent = [int][Math]::Round($output.Size * $output.Scale)
            $offset = [int][Math]::Floor(($output.Size - $extent) / 2)
            $graphics.DrawImage($image, [Drawing.Rectangle]::new($offset, $offset, $extent, $extent))
            $bitmap.Save((Join-Path $brandRoot $output.Name), [Drawing.Imaging.ImageFormat]::Png)
        } finally { $graphics.Dispose(); $bitmap.Dispose() }
    }
} finally { $image.Dispose() }
