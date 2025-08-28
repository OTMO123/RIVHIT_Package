/**
 * Printer Diagnostics Service - для диагностики и исправления проблем печати GoDEX
 */

export interface PrinterDiagnostics {
  labelSize: {
    width: number;
    height: number;
    unit: 'mm' | 'dots';
  };
  dpi: number;
  coordinates: {
    maxX: number;
    maxY: number;
  };
  issues: string[];
  recommendations: string[];
}

export interface EZPLValidationResult {
  isValid: boolean;
  issues: string[];
  correctedCommands?: string;
  analysis: {
    labelDimensions: { width: number; height: number };
    coordinateRange: { minX: number; maxX: number; minY: number; maxY: number };
    commandCounts: { [key: string]: number };
  };
}

export class PrinterDiagnosticsService {
  
  /**
   * Анализ EZPL кода на проблемы координат и настроек
   */
  public analyzeEZPL(ezplCode: string): EZPLValidationResult {
    const lines = ezplCode.split('\n').filter(line => line.trim());
    const issues: string[] = [];
    let labelWidth = 0;
    let labelHeight = 0;
    let dpi = 300; // Default for GoDEX
    
    const coordinates = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    const commandCounts: { [key: string]: number } = {};
    
    // Анализ каждой команды
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(';')) continue;
      
      const commandType = this.getCommandType(trimmed);
      commandCounts[commandType] = (commandCounts[commandType] || 0) + 1;
      
      // Проверяем настройки размера этикетки
      if (trimmed.startsWith('^Q')) {
        const match = trimmed.match(/\^Q(\d+),(\d+)/);
        if (match) {
          labelHeight = parseInt(match[1]);
          // ^Q задает длину этикетки в mm
        }
      }
      
      if (trimmed.startsWith('^W')) {
        const match = trimmed.match(/\^W(\d+)/);
        if (match) {
          labelWidth = parseInt(match[1]);
          // ^W задает ширину этикетки в mm
        }
      }
      
      // Извлекаем координаты из команд позиционирования
      this.extractCoordinates(trimmed, coordinates);
    }
    
    // Конвертируем mm в dots (точки) для сравнения
    const labelWidthDots = labelWidth * (dpi / 25.4); // 25.4 mm в дюйме
    const labelHeightDots = labelHeight * (dpi / 25.4);
    
    // Проверяем проблемы координат
    if (coordinates.maxX > labelWidthDots) {
      issues.push(`Координата X ${coordinates.maxX} превышает ширину этикетки ${labelWidthDots} dots (${labelWidth}mm)`);
    }
    
    if (coordinates.maxY > labelHeightDots) {
      issues.push(`Координата Y ${coordinates.maxY} превышает высоту этикетки ${labelHeightDots} dots (${labelHeight}mm)`);
    }
    
    // Проверяем отрицательные координаты
    if (coordinates.minX < 0 || coordinates.minY < 0) {
      issues.push('Найдены отрицательные координаты');
    }
    
    // Проверяем настройки печати
    this.validatePrintSettings(lines, issues);
    
    return {
      isValid: issues.length === 0,
      issues,
      analysis: {
        labelDimensions: { width: labelWidth, height: labelHeight },
        coordinateRange: coordinates,
        commandCounts
      }
    };
  }
  
  /**
   * Генерация тестовой этикетки для калибровки
   */
  public generateCalibrationLabel(labelWidthMm: number, labelHeightMm: number): string {
    const dpi = 300;
    const widthDots = Math.floor(labelWidthMm * (dpi / 25.4));
    const heightDots = Math.floor(labelHeightMm * (dpi / 25.4));
    
    return [
      // Основные настройки
      `^Q${labelHeightMm},3`,     // Длина этикетки и gap
      `^W${labelWidthMm}`,        // Ширина этикетки  
      '^H8',                      // Умеренная плотность печати
      '^P1',                      // Печать 1 копии
      '^S4',                      // Скорость
      '^AD',                      // Auto-detect
      '^C1',                      // Copy count
      '^R0',                      // Reference point (0,0 top-left)
      '~Q+0',                     // Quality
      '^O0',                      // Offset
      '^D0',                      // Density
      '^E20',                     // Edge
      '~R255',                    // Ribbon
      '^L',                       // Start formatting
      '',
      // Тестовые элементы
      `; Calibration test ${labelWidthMm}x${labelHeightMm}mm (${widthDots}x${heightDots} dots)`,
      '',
      // Внешняя рамка - проверяем границы
      `R5,5,${widthDots-5},${heightDots-5},2`,
      '',
      // Тестовый текст по углам
      'A20,20,0,3,1,1,N,"TOP-LEFT"',
      `A${widthDots-120},20,0,3,1,1,N,"TOP-RIGHT"`,
      `A20,${heightDots-40},0,3,1,1,N,"BOTTOM-LEFT"`,
      `A${widthDots-150},${heightDots-40},0,3,1,1,N,"BOTTOM-RIGHT"`,
      '',
      // Центральный текст
      `A${Math.floor(widthDots/2)-60},${Math.floor(heightDots/2)-20},0,4,2,2,N,"CENTER"`,
      '',
      // Линии сетки для проверки позиционирования
      `L${Math.floor(widthDots/2)},10,${Math.floor(widthDots/2)},${heightDots-10},1`,
      `L10,${Math.floor(heightDots/2)},${widthDots-10},${Math.floor(heightDots/2)},1`,
      '',
      'E'
    ].join('\n');
  }
  
  /**
   * Исправление координат в EZPL коде
   */
  public fixCoordinates(ezplCode: string, targetWidthMm: number, targetHeightMm: number): string {
    const analysis = this.analyzeEZPL(ezplCode);
    
    if (analysis.isValid) {
      return ezplCode; // Ничего исправлять не нужно
    }
    
    const dpi = 300;
    const targetWidthDots = targetWidthMm * (dpi / 25.4);
    const targetHeightDots = targetHeightMm * (dpi / 25.4);
    
    const scaleX = targetWidthDots / analysis.analysis.coordinateRange.maxX;
    const scaleY = targetHeightDots / analysis.analysis.coordinateRange.maxY;
    
    // Применяем масштабирование к координатам
    const lines = ezplCode.split('\n');
    const correctedLines = lines.map(line => {
      return this.scaleCoordinatesInLine(line, scaleX, scaleY);
    });
    
    // Обновляем настройки размера этикетки
    const correctedCode = correctedLines.join('\n')
      .replace(/\^Q\d+,\d+/, `^Q${targetHeightMm},3`)
      .replace(/\^W\d+/, `^W${targetWidthMm}`);
    
    return correctedCode;
  }
  
  private getCommandType(command: string): string {
    if (command.startsWith('^')) return command.substring(0, 2);
    if (command.startsWith('~')) return command.substring(0, 2);
    if (command.startsWith('A')) return 'A';
    if (command.startsWith('B')) return 'B';
    if (command.startsWith('R')) return 'R';
    if (command.startsWith('L')) return 'L';
    return 'OTHER';
  }
  
  private extractCoordinates(command: string, coordinates: any): void {
    // Извлекаем координаты из различных команд
    const patterns = [
      /^A[H]?(\d+),(\d+),/, // A или AH команды (текст)
      /^B(\d+),(\d+),/,     // B команды (штрих-код)
      /^R(\d+),(\d+),(\d+),(\d+),/, // R команды (прямоугольник)
      /^L(\d+),(\d+),(\d+),(\d+),/  // L команды (линия)
    ];
    
    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match) {
        const x1 = parseInt(match[1]);
        const y1 = parseInt(match[2]);
        
        coordinates.minX = Math.min(coordinates.minX, x1);
        coordinates.maxX = Math.max(coordinates.maxX, x1);
        coordinates.minY = Math.min(coordinates.minY, y1);
        coordinates.maxY = Math.max(coordinates.maxY, y1);
        
        // Для прямоугольников и линий учитываем вторую точку
        if (match[3] && match[4]) {
          const x2 = parseInt(match[3]);
          const y2 = parseInt(match[4]);
          coordinates.maxX = Math.max(coordinates.maxX, x2);
          coordinates.maxY = Math.max(coordinates.maxY, y2);
        }
        break;
      }
    }
  }
  
  private validatePrintSettings(lines: string[], issues: string[]): void {
    let hasLabelStart = false;
    let hasLabelEnd = false;
    
    for (const line of lines) {
      if (line.trim() === '^L') hasLabelStart = true;
      if (line.trim() === 'E') hasLabelEnd = true;
      
      // Проверяем потенциально проблемные настройки
      if (line.startsWith('^H')) {
        const heat = parseInt(line.replace('^H', ''));
        if (heat > 15) {
          issues.push(`Слишком высокая плотность печати ^H${heat} (рекомендуется <= 15)`);
        }
      }
    }
    
    if (!hasLabelStart) issues.push('Отсутствует команда начала этикетки ^L');
    if (!hasLabelEnd) issues.push('Отсутствует команда окончания этикетки E');
  }
  
  private scaleCoordinatesInLine(line: string, scaleX: number, scaleY: number): string {
    // Масштабируем координаты в строке
    return line.replace(
      /^(A[H]?|B|R|L)(\d+),(\d+),(.*)$/,
      (match, command, x, y, rest) => {
        const newX = Math.floor(parseInt(x) * scaleX);
        const newY = Math.floor(parseInt(y) * scaleY);
        return `${command}${newX},${newY},${rest}`;
      }
    ).replace(
      /^(R|L)(\d+),(\d+),(\d+),(\d+),(.*)$/,
      (match, command, x1, y1, x2, y2, rest) => {
        const newX1 = Math.floor(parseInt(x1) * scaleX);
        const newY1 = Math.floor(parseInt(y1) * scaleY);
        const newX2 = Math.floor(parseInt(x2) * scaleX);
        const newY2 = Math.floor(parseInt(y2) * scaleY);
        return `${command}${newX1},${newY1},${newX2},${newY2},${rest}`;
      }
    );
  }
}