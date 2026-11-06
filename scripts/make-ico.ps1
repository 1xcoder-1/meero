# One-time tool: pack assets/meero.png into a multi-size Windows .ico
# (PNG-compressed ICO entries: 16/32/48/64/128/256 — legal since Vista).
param(
    [Parameter(Mandatory)] [string]$Source,
    [Parameter(Mandatory)] [string]$Out
)

Add-Type -AssemblyName System.Drawing

# Fail fast if the source has no alpha channel — a solid white square baked
# into the icon is worse than a smaller icon.
$img = [System.Drawing.Image]::FromFile((Resolve-Path $Source))
if ($img.PixelFormat -notmatch 'Argb') {
    $img.Dispose()
    throw "source PNG has no alpha channel: $Source"
}
$img.Dispose()

$src = [System.Drawing.Image]::FromFile((Resolve-Path $Source))
$sizes = 16, 32, 48, 64, 128, 256

$entries = foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, 0, 0, $s, $s)
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    [pscustomobject]@{ Size = $s; Bytes = $ms.ToArray() }
    $ms.Dispose()
}
$src.Dispose()

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)
$bw.Write([UInt16]0)                # reserved
$bw.Write([UInt16]1)                # type: icon
$bw.Write([UInt16]$entries.Count)   # count

$offset = 6 + 16 * $entries.Count
foreach ($e in $entries) {
    $dim = if ($e.Size -ge 256) { 0 } else { $e.Size }   # 0 means 256
    $bw.Write([Byte]$dim)           # width
    $bw.Write([Byte]$dim)           # height
    $bw.Write([Byte]0)              # palette colors
    $bw.Write([Byte]0)              # reserved
    $bw.Write([UInt16]1)            # color planes
    $bw.Write([UInt16]32)           # bits per pixel
    $bw.Write([UInt32]$e.Bytes.Length)
    $bw.Write([UInt32]$offset)
    $offset += $e.Bytes.Length
}
foreach ($e in $entries) { $bw.Write($e.Bytes) }

$bw.Flush()
[System.IO.File]::WriteAllBytes($Out, $ms.ToArray())
$bw.Dispose()

Write-Host "wrote $Out ($((Get-Item $Out).Length) bytes, sizes: $($sizes -join '/'))"
