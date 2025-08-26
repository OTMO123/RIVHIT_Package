#!/bin/bash

echo "=== Сканирование сети 192.168.14.x на порт 9101 ==="
echo "Поиск устройств с открытым портом 9101..."
echo ""

found=0

for i in {1..254}; do
    ip="192.168.14.$i"
    nc -z -w 1 $ip 9101 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Найдено устройство: $ip:9101"
        found=$((found + 1))
    fi
    
    # Показываем прогресс каждые 25 адресов
    if [ $(( i % 25 )) -eq 0 ]; then
        echo -n "  Проверено: $i из 254..."
        echo -ne "\r"
    fi
done

echo ""
echo ""
echo "=== Результаты сканирования ==="
echo "Найдено устройств с портом 9101: $found"

if [ $found -eq 0 ]; then
    echo ""
    echo "Порт 9101 не найден. Проверяем порт 9100..."
    echo ""
    
    for i in {1..254}; do
        ip="192.168.14.$i"
        nc -z -w 1 $ip 9100 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Найдено на порту 9100: $ip"
        fi
    done
fi