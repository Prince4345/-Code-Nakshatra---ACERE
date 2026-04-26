Add-Type -AssemblyName System.Drawing

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$assetsPath = Join-Path (Split-Path -Parent $scriptRoot) 'assets'

function New-Color([int]$r, [int]$g, [int]$b, [int]$a = 255) {
  return [System.Drawing.Color]::FromArgb($a, $r, $g, $b)
}

function New-RoundedRectPath([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Graphics([System.Drawing.Bitmap]$bitmap) {
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return $graphics
}

function Draw-Background([System.Drawing.Graphics]$graphics, [int]$size) {
  $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    (New-Color 4 16 28),
    (New-Color 45 109 246),
    45
  )
  $graphics.FillRectangle($brush, $rect)
  $brush.Dispose()

  $orbBrush = New-Object System.Drawing.SolidBrush((New-Color 32 211 255 32))
  $graphics.FillEllipse($orbBrush, [single]($size * 0.48), [single]($size * 0.05), [single]($size * 0.42), [single]($size * 0.42))
  $graphics.FillEllipse($orbBrush, [single](-$size * 0.12), [single]($size * 0.6), [single]($size * 0.34), [single]($size * 0.34))
  $orbBrush.Dispose()

  $panelPath = New-RoundedRectPath ([single]($size * 0.11)) ([single]($size * 0.11)) ([single]($size * 0.78)) ([single]($size * 0.78)) ([single]($size * 0.12))
  $panelBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.RectangleF([single]($size * 0.11), [single]($size * 0.11), [single]($size * 0.78), [single]($size * 0.78))),
    (New-Color 10 23 40 230),
    (New-Color 15 32 55 242),
    90
  )
  $panelPen = New-Object System.Drawing.Pen((New-Color 125 198 255 72), [single]($size * 0.012))
  $graphics.FillPath($panelBrush, $panelPath)
  $graphics.DrawPath($panelPen, $panelPath)
  $panelPen.Dispose()
  $panelBrush.Dispose()
  $panelPath.Dispose()
}

function Draw-Emblem([System.Drawing.Graphics]$graphics, [single]$cx, [single]$cy, [single]$size, [bool]$withPlate) {
  if ($withPlate) {
    $platePath = New-RoundedRectPath ([single]($cx - $size * 0.42)) ([single]($cy - $size * 0.42)) ([single]($size * 0.84)) ([single]($size * 0.84)) ([single]($size * 0.18))
    $plateBrush = New-Object System.Drawing.SolidBrush((New-Color 12 31 56 210))
    $platePen = New-Object System.Drawing.Pen((New-Color 132 198 255 84), [single]($size * 0.028))
    $graphics.FillPath($plateBrush, $platePath)
    $graphics.DrawPath($platePen, $platePath)
    $platePen.Dispose()
    $plateBrush.Dispose()
    $platePath.Dispose()
  }

  $ringPen = New-Object System.Drawing.Pen((New-Color 132 198 255), [single]($size * 0.075))
  $ringPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $ringPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawArc($ringPen, [single]($cx - $size * 0.34), [single]($cy - $size * 0.34), [single]($size * 0.68), [single]($size * 0.68), 200, 282)
  $ringPen.Dispose()

  $accentPen = New-Object System.Drawing.Pen((New-Color 32 211 255), [single]($size * 0.038))
  $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawArc($accentPen, [single]($cx - $size * 0.24), [single]($cy - $size * 0.24), [single]($size * 0.48), [single]($size * 0.48), 16, 132)
  $accentPen.Dispose()

  $dotBrush = New-Object System.Drawing.SolidBrush((New-Color 32 211 255))
  $graphics.FillEllipse($dotBrush, [single]($cx + $size * 0.16), [single]($cy - $size * 0.22), [single]($size * 0.08), [single]($size * 0.08))
  $dotBrush.Dispose()

  $font = New-Object System.Drawing.Font('Segoe UI Semibold', [single]($size * 0.22), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $textBrush = New-Object System.Drawing.SolidBrush((New-Color 244 248 255))
  $graphics.DrawString('CT', $font, $textBrush, $cx, [single]($cy + $size * 0.01), $format)
  $textBrush.Dispose()
  $font.Dispose()
  $format.Dispose()
}

function Save-Bitmap([System.Drawing.Bitmap]$bitmap, [string]$path) {
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

$icon = New-Object System.Drawing.Bitmap 1024, 1024
$iconGraphics = New-Graphics $icon
Draw-Background $iconGraphics 1024
Draw-Emblem $iconGraphics 512 512 620 $true
$iconGraphics.Dispose()
Save-Bitmap $icon (Join-Path $assetsPath 'icon.png')

$adaptive = New-Object System.Drawing.Bitmap 1024, 1024
$adaptiveGraphics = New-Graphics $adaptive
$adaptiveGraphics.Clear([System.Drawing.Color]::Transparent)
Draw-Emblem $adaptiveGraphics 512 512 560 $false
$adaptiveGraphics.Dispose()
Save-Bitmap $adaptive (Join-Path $assetsPath 'adaptive-icon.png')

$splash = New-Object System.Drawing.Bitmap 1400, 1400
$splashGraphics = New-Graphics $splash
$splashGraphics.Clear([System.Drawing.Color]::Transparent)
Draw-Emblem $splashGraphics 700 520 420 $false

$titleFont = New-Object System.Drawing.Font('Segoe UI Semibold', 112, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$subtitleFont = New-Object System.Drawing.Font('Segoe UI', 44, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$centerFormat = New-Object System.Drawing.StringFormat
$centerFormat.Alignment = [System.Drawing.StringAlignment]::Center
$centerFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$titleBrush = New-Object System.Drawing.SolidBrush((New-Color 244 248 255))
$subtitleBrush = New-Object System.Drawing.SolidBrush((New-Color 141 166 198))
$splashGraphics.DrawString('CarbonTrace', $titleFont, $titleBrush, 700, 900, $centerFormat)
$splashGraphics.DrawString('Mobile', $subtitleFont, $subtitleBrush, 700, 1000, $centerFormat)
$subtitleBrush.Dispose()
$titleBrush.Dispose()
$titleFont.Dispose()
$subtitleFont.Dispose()
$centerFormat.Dispose()
$splashGraphics.Dispose()
Save-Bitmap $splash (Join-Path $assetsPath 'splash-icon.png')

$favicon = New-Object System.Drawing.Bitmap 64, 64
$faviconGraphics = New-Graphics $favicon
Draw-Background $faviconGraphics 64
Draw-Emblem $faviconGraphics 32 32 40 $true
$faviconGraphics.Dispose()
Save-Bitmap $favicon (Join-Path $assetsPath 'favicon.png')
