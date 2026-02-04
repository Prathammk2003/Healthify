# Cleanup and organize project files
# This script moves documentation, test files, and Python scripts to _archive folder

Write-Host "🧹 Starting project cleanup..." -ForegroundColor Green

# Get all .md files except README.md
$mdFiles = Get-ChildItem -Path "." -Filter "*.md" | Where-Object { $_.Name -ne "README.md" }
Write-Host "Found $($mdFiles.Count) documentation files to archive"

# Move documentation files
foreach ($file in $mdFiles) {
    try {
        Copy-Item -Path $file.FullName -Destination "_archive\documentation\$($file.Name)" -Force
        Write-Host "  ✅ Archived: $($file.Name)"
    } catch {
        Write-Host "  ⚠️  Skipped (in use): $($file.Name)" -ForegroundColor Yellow
    }
}

# Get all test .js files
$testFiles = Get-ChildItem -Path "." -Filter "*test*.js"
$testFiles += Get-ChildItem -Path "." -Filter "*demo*.js"
$testFiles += Get-ChildItem -Path "." -Filter "check-*.js"
Write-Host "`nFound $($testFiles.Count) test script files to archive"

# Move test files
foreach ($file in $testFiles) {
    try {
        Copy-Item -Path $file.FullName -Destination "_archive\test-scripts\$($file.Name)" -Force
        Write-Host "  ✅ Archived: $($file.Name)"
    } catch {
        Write-Host "  ⚠️  Skipped (in use): $($file.Name)" -ForegroundColor Yellow
    }
}

# Get all Python files
$pyFiles = Get-ChildItem -Path "." -Filter "*.py"
Write-Host "`nFound $($pyFiles.Count) Python script files to archive"

# Move Python files
foreach ($file in $pyFiles) {
    try {
        Copy-Item -Path $file.FullName -Destination "_archive\python-scripts\$($file.Name)" -Force
        Write-Host "  ✅ Archived: $($file.Name)"
    } catch {
        Write-Host "  ⚠️  Skipped (in use): $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Cleanup complete! Files copied to _archive folder." -ForegroundColor Green
Write-Host "📁 Check _archive folder for organized files." -ForegroundColor Cyan
Write-Host "⚠️  Original files are still in place. Delete manually if needed." -ForegroundColor Yellow
