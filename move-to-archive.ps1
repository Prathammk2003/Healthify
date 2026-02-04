# 🧹 COMPLETE PROJECT CLEANUP SCRIPT
# This will move ALL unnecessary files to _archive folder

Write-Host "`n🧹 COMPLETE PROJECT CLEANUP" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Create archive folders
Write-Host "📁 Creating archive folders..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "_archive\test-scripts" -Force | Out-Null
New-Item -ItemType Directory -Path "_archive\python-scripts" -Force | Out-Null
New-Item -ItemType Directory -Path "_archive\config-files" -Force | Out-Null
New-Item -ItemType Directory -Path "_archive\old-folders" -Force | Out-Null
Write-Host "✅ Folders created`n" -ForegroundColor Green

# Move test .js files
Write-Host "📝 Moving test JavaScript files..." -ForegroundColor Yellow
$testFiles = Get-ChildItem -Path "." -Filter "*.js" | Where-Object { 
    ($_.Name -match "test|demo|debug|diagnose|verify|check-user|simple-|final-|user-|modality-|restart-|download-|instrumentation|postprocess|regression|standardized|structured") -and
    ($_.Name -ne "start-all.js")
}

$testCount = 0
foreach ($file in $testFiles) {
    try {
        Move-Item -Path $file.FullName -Destination "_archive\test-scripts\$($file.Name)" -Force
        Write-Host "  ✅ $($file.Name)" -ForegroundColor Green
        $testCount++
    } catch {
        Write-Host "  ⚠️  $($file.Name) (in use)" -ForegroundColor Yellow
    }
}
Write-Host "Moved $testCount test files`n" -ForegroundColor Cyan

# Move Python files
Write-Host "🐍 Moving Python files..." -ForegroundColor Yellow
$pyFiles = Get-ChildItem -Path "." -Filter "*.py"
$pyCount = 0
foreach ($file in $pyFiles) {
    try {
        Move-Item -Path $file.FullName -Destination "_archive\python-scripts\$($file.Name)" -Force
        Write-Host "  ✅ $($file.Name)" -ForegroundColor Green
        $pyCount++
    } catch {
        Write-Host "  ⚠️  $($file.Name) (in use)" -ForegroundColor Yellow
    }
}
Write-Host "Moved $pyCount Python files`n" -ForegroundColor Cyan

# Move .cjs files
Write-Host "📦 Moving .cjs files..." -ForegroundColor Yellow
$cjsFiles = Get-ChildItem -Path "." -Filter "*.cjs"
foreach ($file in $cjsFiles) {
    try {
        Move-Item -Path $file.FullName -Destination "_archive\test-scripts\$($file.Name)" -Force
        Write-Host "  ✅ $($file.Name)" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  $($file.Name) (in use)" -ForegroundColor Yellow
    }
}

# Move config files
Write-Host "`n⚙️  Moving config files..." -ForegroundColor Yellow
$configFiles = @(
    ".cursorignore",
    ".env.twilio",
    ".env.vonage",
    "cleanup-project.ps1",
    "requirements.txt",
    "setup.ps1",
    "training-requirements.txt"
)

$configCount = 0
foreach ($file in $configFiles) {
    if (Test-Path $file) {
        try {
            Move-Item -Path $file -Destination "_archive\config-files\$file" -Force
            Write-Host "  ✅ $file" -ForegroundColor Green
            $configCount++
        } catch {
            Write-Host "  ⚠️  $file (in use)" -ForegroundColor Yellow
        }
    }
}
Write-Host "Moved $configCount config files`n" -ForegroundColor Cyan

# Move old folders
Write-Host "📂 Moving old folders..." -ForegroundColor Yellow
$oldFolders = @("-p", ".venv", ".vercel", ".vscode", "logs", "scripts", "test", "trained_models")
$folderCount = 0
foreach ($folder in $oldFolders) {
    if (Test-Path $folder) {
        try {
            Move-Item -Path $folder -Destination "_archive\old-folders\$folder" -Force
            Write-Host "  ✅ $folder/" -ForegroundColor Green
            $folderCount++
        } catch {
            Write-Host "  ⚠️  $folder/ (in use)" -ForegroundColor Yellow
        }
    }
}
Write-Host "Moved $folderCount folders`n" -ForegroundColor Cyan

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "✅ CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Cyan

Write-Host "📊 Summary:" -ForegroundColor Yellow
Write-Host "  • Test files moved: $testCount"
Write-Host "  • Python files moved: $pyCount"
Write-Host "  • Config files moved: $configCount"
Write-Host "  • Folders moved: $folderCount"
Write-Host "`n📁 All files are in _archive folder"
Write-Host "🎯 Your project root is now clean!`n"

# List remaining files in root
Write-Host "📋 Remaining files in root:" -ForegroundColor Cyan
Get-ChildItem -Path "." -File | Select-Object Name | Format-Table -AutoSize

Write-Host "`n✅ You can now restart your app: npm run start:all" -ForegroundColor Green
