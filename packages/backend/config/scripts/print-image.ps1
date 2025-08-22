# PowerShell script to print PNG image
param(
    [string]$ImagePath,
    [string]$PrinterName = "GoDEX ZX420i"
)

try {
    # Load System.Drawing assembly
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Windows.Forms
    
    # Load image
    $image = [System.Drawing.Image]::FromFile($ImagePath)
    
    # Create PrintDocument
    $printDocument = New-Object System.Drawing.Printing.PrintDocument
    $printDocument.PrinterSettings.PrinterName = $PrinterName
    
    # Set print event handler
    $printDocument.add_PrintPage({
        param($sender, $e)
        $e.Graphics.DrawImage($image, 0, 0)
    })
    
    # Print
    $printDocument.Print()
    Write-Host "✅ Image printed successfully: $ImagePath"
    
} catch {
    Write-Host "❌ Error printing image: $($_.Exception.Message)"
}