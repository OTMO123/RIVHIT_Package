# Analyze EZPX file from GoLabel II
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " EZPX File Analyzer" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

Write-Host "`n[1] EZPX is an XML-based format used by GoLabel II" -ForegroundColor Yellow
Write-Host "It contains label design and printer commands" -ForegroundColor Gray

# Find EZPX files
Write-Host "`n[2] Looking for EZPX files..." -ForegroundColor Yellow
$ezpxFiles = Get-ChildItem -Path . -Filter "*.ezpx" -ErrorAction SilentlyContinue
if ($ezpxFiles) {
    Write-Host "Found EZPX files:" -ForegroundColor Green
    foreach ($file in $ezpxFiles) {
        Write-Host "  - $($file.Name)" -ForegroundColor Gray
        
        # Read and display content
        Write-Host "`nContent of $($file.Name):" -ForegroundColor Yellow
        $content = Get-Content $file.FullName -Raw
        
        # EZPX is usually a zip file, try to extract
        $tempPath = "$env:TEMP\ezpx_extract"
        New-Item -Path $tempPath -ItemType Directory -Force | Out-Null
        
        try {
            # Copy as zip and extract
            $zipFile = "$tempPath\temp.zip"
            Copy-Item $file.FullName $zipFile
            Expand-Archive -Path $zipFile -DestinationPath $tempPath -Force
            
            Write-Host "Extracted files:" -ForegroundColor Green
            Get-ChildItem $tempPath -Recurse | ForEach-Object {
                Write-Host "  - $($_.Name)" -ForegroundColor Gray
            }
            
            # Look for label content
            $labelFile = Get-ChildItem $tempPath -Filter "*.xml" -Recurse | Select-Object -First 1
            if ($labelFile) {
                Write-Host "`nLabel XML content:" -ForegroundColor Yellow
                $xml = Get-Content $labelFile.FullName -Raw
                Write-Host $xml.Substring(0, [Math]::Min(500, $xml.Length)) "..."
            }
            
        } catch {
            Write-Host "Could not extract EZPX (might not be zip format)" -ForegroundColor Yellow
            Write-Host "Raw content preview:" -ForegroundColor Yellow
            Write-Host $content.Substring(0, [Math]::Min(500, $content.Length)) "..."
        }
        
        Remove-Item $tempPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n[3] To export EZPL commands from GoLabel II:" -ForegroundColor Yellow
Write-Host "1. Open your label in GoLabel II" -ForegroundColor White
Write-Host "2. File -> Export" -ForegroundColor White
Write-Host "3. Choose 'Printer Command File (*.prn)'" -ForegroundColor White
Write-Host "4. This will give you the actual EZPL commands" -ForegroundColor White

Write-Host "`n[4] Alternative - Print to File:" -ForegroundColor Yellow
Write-Host "1. File -> Print" -ForegroundColor White
Write-Host "2. Check 'Print to File'" -ForegroundColor White
Write-Host "3. Save as .prn file" -ForegroundColor White
Write-Host "4. Open .prn in Notepad to see commands" -ForegroundColor White

Write-Host "`n[5] Or use Print Preview:" -ForegroundColor Yellow
Write-Host "1. File -> Print Preview" -ForegroundColor White
Write-Host "2. Tools -> Command" -ForegroundColor White
Write-Host "3. This might show the EZPL commands" -ForegroundColor White