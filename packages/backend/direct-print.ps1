param(
    [Parameter(Mandatory=$true)]
    [string]$EzpxFile
)

# Method 1: Try opening with default print action
try {
    Start-Process -FilePath $EzpxFile -Verb Print -Wait
    Write-Host "Print command sent via Windows" -ForegroundColor Green
} catch {
    Write-Host "Direct print failed, opening GoLabel..." -ForegroundColor Yellow
    
    # Method 2: Open with GoLabel
    $golabel = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"
    Start-Process -FilePath $golabel -ArgumentList """$EzpxFile""" -Wait
}
