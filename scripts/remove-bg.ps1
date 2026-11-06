# One-time tool: knock out the flat background of the generated logo PNG and
# re-save it as 32bpp ARGB (needed for a clean .ico — opaque white corners
# would bake a white square into every icon size).
param(
    [Parameter(Mandatory)] [string]$Source,
    [Parameter(Mandatory)] [string]$Out,
    [int]$Tolerance = 40
)

Add-Type -AssemblyName System.Drawing

$src = New-Object System.Drawing.Bitmap $Source
if ($src.Width -ne $src.Height) { throw "expected square source" }

# Background = average of the four corners
function Get-Avg($x, $y) { $script:src.GetPixel($x, $y) }
$c1 = Get-Avg 0 0
$c2 = Get-Avg ($src.Width - 1) 0
$c3 = Get-Avg 0 ($src.Height - 1)
$c4 = Get-Avg ($src.Width - 1) ($src.Height - 1)
$bgR = ($c1.R + $c2.R + $c3.R + $c4.R) / 4
$bgG = ($c1.G + $c2.G + $c3.G + $c4.G) / 4
$bgB = ($c1.B + $c2.B + $c3.B + $c4.B) / 4
Write-Host "background rgb($bgR, $bgG, $bgB), tolerance $Tolerance"

$fmt = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
$dst = New-Object System.Drawing.Bitmap $src.Width, $src.Height, $fmt

$rect = New-Object System.Drawing.Rectangle 0, 0, $src.Width, $src.Height
$dataSrc = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$dataDst = $dst.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $fmt)

$ptrS = [System.IntPtr]::new($dataSrc.Scan0.ToInt64())
$ptrD = [System.IntPtr]::new($dataDst.Scan0.ToInt64())
$rowBytesS = $dataSrc.Stride   # BGRA rows even for 24bpp (stride padded)
$rowBytesD = $dataDst.Stride
$bufS = New-Object byte[] ($rowBytesS * $src.Height)
$bufD = New-Object byte[] ($rowBytesD * $src.Height)
[System.Runtime.InteropServices.Marshal]::Copy($ptrS, $bufS, 0, $bufS.Length)

for ($y = 0; $y -lt $src.Height; $y++) {
    $rs = $y * $rowBytesS
    $rd = $y * $rowBytesD
    for ($x = 0; $x -lt $src.Width; $x++) {
        $s = $rs + $x * 3      # 24bpp: B,G,R
        $d = $rd + $x * 4      # 32bpp: B,G,R,A
        $dB = [Math]::Abs($bufS[$s]     - $bgB)
        $dG = [Math]::Abs($bufS[$s + 1] - $bgG)
        $dR = [Math]::Abs($bufS[$s + 2] - $bgR)
        $bufD[$d]     = $bufS[$s]
        $bufD[$d + 1] = $bufS[$s + 1]
        $bufD[$d + 2] = $bufS[$s + 2]
        $bufD[$d + 3] = if (($dB -le $Tolerance) -and ($dG -le $Tolerance) -and ($dR -le $Tolerance)) { 0 } else { 255 }
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($bufD, 0, $ptrD, $bufD.Length)
$src.UnlockBits($dataSrc)
$dst.UnlockBits($dataDst)
$src.Dispose()

$dst.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Dispose()
Write-Host "wrote $Out (32bpp ARGB)"
