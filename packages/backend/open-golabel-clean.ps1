# Открываем GoLabel без файлов для создания образца

$golabelPath = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"

if (Test-Path $golabelPath) {
    Write-Host "Открываем GoLabel..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Инструкции:" -ForegroundColor Yellow
    Write-Host "1. Создайте новую этикетку (File -> New)" -ForegroundColor White
    Write-Host "2. Установите размер: 80x50 мм" -ForegroundColor White
    Write-Host "3. Добавьте текст: 'Test Label'" -ForegroundColor White
    Write-Host "4. Добавьте штрих-код: Code128 с данными '123456'" -ForegroundColor White
    Write-Host "5. Сохраните как: sample.ezpx" -ForegroundColor White
    Write-Host "6. Закройте GoLabel" -ForegroundColor White
    Write-Host ""
    
    # Открываем GoLabel
    Start-Process $golabelPath
    
    Write-Host "Нажмите Enter после создания файла..."
    Read-Host
    
    # Ищем созданный файл
    $searchPaths = @(
        "$env:USERPROFILE\Documents",
        "$env:USERPROFILE\Desktop",
        ".",
        "$env:USERPROFILE\Documents\GoLabel"
    )
    
    foreach ($path in $searchPaths) {
        $found = Get-ChildItem -Path $path -Filter "sample.ezpx" -ErrorAction SilentlyContinue
        if ($found) {
            Write-Host "Найден файл: $($found.FullName)" -ForegroundColor Green
            
            # Показываем содержимое
            Write-Host ""
            Write-Host "Содержимое файла:" -ForegroundColor Yellow
            Get-Content $found.FullName | Select-Object -First 50 | ForEach-Object {
                Write-Host $_ -ForegroundColor Gray
            }
            
            # Копируем в текущую директорию
            Copy-Item $found.FullName -Destination ".\golabel_sample_original.ezpx"
            Write-Host ""
            Write-Host "Файл скопирован как: golabel_sample_original.ezpx" -ForegroundColor Green
            break
        }
    }
} else {
    Write-Host "GoLabel не найден!" -ForegroundColor Red
}