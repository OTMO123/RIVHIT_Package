# Скрипт для анализа формата EZPX файлов GoLabel

Write-Host "Анализатор формата EZPX файлов" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""

# Поиск существующих EZPX файлов
$searchPaths = @(
    "$env:USERPROFILE\Documents",
    "$env:USERPROFILE\Desktop", 
    "C:\GoLabelHotFolder",
    "C:\Program Files (x86)\Godex\GoLabel II\Templates",
    "C:\Program Files (x86)\Godex\GoLabel II\Samples",
    "C:\Program Files (x86)\Godex\GoLabel II",
    "."
)

Write-Host "Поиск EZPX файлов..." -ForegroundColor Yellow

$ezpxFiles = @()
foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        $files = Get-ChildItem -Path $path -Filter "*.ezpx" -ErrorAction SilentlyContinue
        if ($files) {
            $ezpxFiles += $files
            Write-Host "Найдено в $path : $($files.Count) файлов" -ForegroundColor Gray
        }
    }
}

# Поиск также EZP файлов (старый формат)
Write-Host "Поиск EZP файлов..." -ForegroundColor Yellow
foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        $files = Get-ChildItem -Path $path -Filter "*.ezp" -ErrorAction SilentlyContinue
        if ($files) {
            $ezpxFiles += $files
            Write-Host "Найдено EZP в $path : $($files.Count) файлов" -ForegroundColor Gray
        }
    }
}

if ($ezpxFiles.Count -eq 0) {
    Write-Host ""
    Write-Host "EZPX/EZP файлы не найдены!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Создаём пример файла в GoLabel:" -ForegroundColor Yellow
    Write-Host "1. Откройте GoLabel" -ForegroundColor White
    Write-Host "2. Создайте новую этикетку (File -> New)" -ForegroundColor White
    Write-Host "3. Добавьте текст и штрих-код" -ForegroundColor White
    Write-Host "4. Сохраните как sample.ezpx" -ForegroundColor White
    Write-Host "5. Запустите этот скрипт снова" -ForegroundColor White
    
    # Попробуем открыть GoLabel для создания примера
    $golabelPath = "C:\Program Files (x86)\Godex\GoLabel II\GoLabel.exe"
    if (Test-Path $golabelPath) {
        Write-Host ""
        Write-Host "Открываем GoLabel..." -ForegroundColor Green
        Start-Process $golabelPath
    }
    
    exit
}

Write-Host ""
Write-Host "Найдено файлов: $($ezpxFiles.Count)" -ForegroundColor Green
Write-Host ""

# Анализ первых нескольких файлов
$maxAnalyze = [Math]::Min(3, $ezpxFiles.Count)

for ($i = 0; $i -lt $maxAnalyze; $i++) {
    $file = $ezpxFiles[$i]
    Write-Host "Анализ файла: $($file.Name)" -ForegroundColor Cyan
    Write-Host "Путь: $($file.FullName)" -ForegroundColor Gray
    Write-Host "Размер: $($file.Length) байт" -ForegroundColor Gray
    
    try {
        # Читаем содержимое
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        
        # Проверяем, это XML или бинарный формат
        if ($content.StartsWith("<?xml")) {
            Write-Host "Формат: XML" -ForegroundColor Green
            
            try {
                [xml]$xml = $content
                Write-Host "Корневой элемент: $($xml.DocumentElement.Name)" -ForegroundColor Yellow
                
                # Показываем первые несколько строк
                Write-Host "Первые строки файла:" -ForegroundColor Yellow
                $lines = $content -split "`n"
                for ($j = 0; $j -lt [Math]::Min(20, $lines.Count); $j++) {
                    Write-Host "  $($lines[$j])" -ForegroundColor Gray
                }
            }
            catch {
                Write-Host "Ошибка парсинга XML: $_" -ForegroundColor Red
                Write-Host "Первые 500 символов:" -ForegroundColor Yellow
                Write-Host $content.Substring(0, [Math]::Min(500, $content.Length)) -ForegroundColor Gray
            }
        }
        else {
            Write-Host "Формат: Бинарный или неизвестный" -ForegroundColor Yellow
            Write-Host "Первые байты (HEX):" -ForegroundColor Yellow
            $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
            $hexString = ($bytes[0..16] | ForEach-Object { $_.ToString("X2") }) -join " "
            Write-Host $hexString -ForegroundColor Gray
        }
        
        # Сохраняем образец
        $sampleFile = "sample_$($file.Extension.TrimStart('.'))_$i.txt"
        if ($content.StartsWith("<?xml")) {
            $content | Out-File -FilePath $sampleFile -Encoding UTF8
            Write-Host "Образец сохранён: $sampleFile" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Ошибка чтения файла: $_" -ForegroundColor Red
    }
    
    Write-Host ("-" * 60) -ForegroundColor Gray
}

Write-Host ""
Write-Host "Дополнительный поиск в реестре..." -ForegroundColor Yellow

# Проверяем реестр на ассоциации файлов
try {
    $ezpxReg = Get-ItemProperty "HKLM:\SOFTWARE\Classes\.ezpx" -ErrorAction SilentlyContinue
    if ($ezpxReg) {
        Write-Host "Найдена регистрация .ezpx: $($ezpxReg.'(default)')" -ForegroundColor Green
    }
}
catch {
    Write-Host "Регистрация .ezpx не найдена" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Рекомендации:" -ForegroundColor Yellow
Write-Host "1. Если файлы не найдены, создайте образец в GoLabel" -ForegroundColor White
Write-Host "2. Проверьте образцы файлов sample_*.txt" -ForegroundColor White
Write-Host "3. Используйте найденную структуру для генерации" -ForegroundColor White