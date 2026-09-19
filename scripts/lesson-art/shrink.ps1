# Makes the drawn lesson pictures small enough for phones and offline mode: 960 px wide JPEG.
# Usage (Windows PowerShell): .\scripts\lesson-art\shrink.ps1 -From <folder of drawn pictures> -To public\lesson-art
param([string]$From, [string]$To, [int]$Width = 960, [int]$Quality = 72)

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $To | Out-Null
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Quality)

Get-ChildItem $From -File | Where-Object { $_.Extension -in '.png', '.jpg', '.jpeg' } | ForEach-Object {
  $source = [System.Drawing.Image]::FromFile($_.FullName)
  $height = [int][Math]::Round($source.Height * $Width / $source.Width)
  $bitmap = New-Object System.Drawing.Bitmap $Width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.DrawImage($source, 0, 0, $Width, $height)
  $bitmap.Save((Join-Path $To ($_.BaseName + '.jpg')), $codec, $params)
  $graphics.Dispose(); $bitmap.Dispose(); $source.Dispose()
}
