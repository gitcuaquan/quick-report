# Cập nhật extension từ GitHub (không cần Chrome Web Store, không cần Git).
#   cap-nhat.ps1             → cập nhật ngay, hiện kết quả
#   cap-nhat.ps1 -Install    → bật tự cập nhật: Windows tự chạy ngầm mỗi 30 phút
#   cap-nhat.ps1 -Uninstall  → tắt tự cập nhật
#   cap-nhat.ps1 -Silent     → chạy ngầm (tác vụ nền dùng), chỉ tải khi có version mới
# Chép file mới đè lên thư mục này xong, extension tự tải lại trong ~1 phút.
param([switch]$Silent, [switch]$Install, [switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$Repo = 'gitcuaquan/quick-report'
$Branch = 'main'
$Dir = $PSScriptRoot
$TaskName = 'LenfulNapSheet-CapNhat'
$Vbs = Join-Path $env:LOCALAPPDATA 'LenfulNapSheet-capnhat.vbs'

function Say ($msg, $color = 'Gray') { if (-not $Silent) { Write-Host $msg -ForegroundColor $color } }

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Remove-Item $Vbs -ErrorAction SilentlyContinue
  Say 'Đã tắt tự cập nhật.' Green
  Start-Sleep -Seconds 3
  exit
}

if ($Install) {
  # Chạy qua wscript (cửa sổ ẩn) để không nháy màn hình đen mỗi 30 phút
  $ps = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $Dir 'cap-nhat.ps1') + '" -Silent'
  $line = 'CreateObject("WScript.Shell").Run "' + $ps.Replace('"', '""') + '", 0, True'
  Set-Content -Path $Vbs -Value $line -Encoding ASCII

  $action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('"' + $Vbs + '"')
  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 30)
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
  Say "Đã bật tự cập nhật: Windows kiểm tra GitHub mỗi 30 phút cho thư mục $Dir" Green
  Say '(Đừng di chuyển / đổi tên thư mục này. Nếu lỡ chuyển, bấm lại tu-dong-cap-nhat.bat ở chỗ mới.)'
  # Cập nhật luôn 1 lần
}

$Tmp = Join-Path $env:TEMP ('napsheet-' + [guid]::NewGuid())
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $local = (Get-Content (Join-Path $Dir 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
  $remote = (Invoke-RestMethod "https://raw.githubusercontent.com/$Repo/$Branch/extension/manifest.json?t=$([DateTime]::Now.Ticks)" -UseBasicParsing).version

  if ([version]$remote -le [version]$local) {
    Say "Đang là bản mới nhất (v$local)." Green
  } else {
    Say "Đang tải v$remote…"
    New-Item -ItemType Directory $Tmp | Out-Null
    Invoke-WebRequest "https://github.com/$Repo/archive/refs/heads/$Branch.zip" -OutFile "$Tmp\src.zip" -UseBasicParsing
    Expand-Archive "$Tmp\src.zip" $Tmp
    $src = Join-Path (Get-ChildItem $Tmp -Directory | Select-Object -First 1).FullName 'extension'
    if (-not (Test-Path "$src\manifest.json")) { throw 'File tải về không có thư mục extension.' }
    Copy-Item "$src\*" $Dir -Recurse -Force
    Say "Đã cập nhật v$local → v$remote. Extension sẽ tự tải lại trong khoảng 1 phút." Green
  }
} catch {
  Say "Cập nhật thất bại: $($_.Exception.Message)" Red
} finally {
  Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
}
if (-not $Silent) { Start-Sleep -Seconds 4 }
