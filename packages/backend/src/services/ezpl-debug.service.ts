/**
 * EZPL Debug Service - для анализа проблем с "черным месивом" на GoDEX
 * НЕ МЕНЯЕМ координаты - они работают на фронтенде правильно!
 */

export class EZPLDebugService {
  
  /**
   * Проверяем возможные причины "черного месива"
   */
  public diagnoseBlackMess(ezplCode: string): {
    issues: string[];
    fixes: string[];
    cleanedCode?: string;
  } {
    const issues: string[] = [];
    const fixes: string[] = [];
    const lines = ezplCode.split('\n');
    
    // 1. Проверяем команды AH вместо A
    let hasAHCommands = false;
    for (const line of lines) {
      if (line.trim().startsWith('AH')) {
        hasAHCommands = true;
        issues.push('Найдены команды AH (horizontal alignment) - могут вызывать проблемы позиционирования');
        fixes.push('Заменить AH команды на обычные A команды');
        break;
      }
    }
    
    // 2. Проверяем перекрывающиеся элементы
    const coordinates = this.extractAllCoordinates(lines);
    const overlapping = this.findOverlappingElements(coordinates);
    if (overlapping.length > 0) {
      issues.push('Найдены перекрывающиеся элементы');
      fixes.push('Разнести элементы по координатам');
    }
    
    // 3. Проверяем отсутствие очистки буфера
    if (!lines.some(line => line.includes('^L'))) {
      issues.push('Отсутствует команда очистки буфера ^L');
      fixes.push('Добавить ^L в начало после настроек');
    }
    
    // 4. Проверяем слишком много элементов в одной области
    const densityIssues = this.checkElementDensity(coordinates);
    if (densityIssues.length > 0) {
      issues.push(...densityIssues);
      fixes.push('Упростить этикетку или увеличить расстояния между элементами');
    }
    
    // Генерируем очищенную версию если найдены проблемы
    let cleanedCode;
    if (hasAHCommands) {
      cleanedCode = this.fixAHCommands(ezplCode);
    }
    
    return { issues, fixes, cleanedCode };
  }
  
  /**
   * Генерируем минимальную тестовую этикетку
   */
  public generateMinimalTest(): string {
    return [
      '^Q30,3',
      '^W100', 
      '^H8',
      '^P1',
      '^S4',
      '^AD',
      '^C1',
      '^R0',
      '~Q+0',
      '^O0',
      '^D0',
      '^E20',
      '~R255',
      '^L',
      '',
      '; Minimal test - just border and text',
      'R50,50,350,200,3',
      'A100,100,0,4,1,1,N,"TEST"',
      'A100,130,0,3,1,1,N,"Minimal Label"',
      '',
      'E'
    ].join('\n');
  }
  
  /**
   * Исправляем команды AH на обычные A
   */
  private fixAHCommands(ezplCode: string): string {
    return ezplCode.replace(/^AH/gm, 'A');
  }
  
  private extractAllCoordinates(lines: string[]): Array<{x: number, y: number, width?: number, height?: number, type: string}> {
    const coords: Array<{x: number, y: number, width?: number, height?: number, type: string}> = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Текст (A или AH команды)
      const textMatch = trimmed.match(/^A[H]?(\d+),(\d+),\d+,\d+,(\d+),(\d+),/);
      if (textMatch) {
        coords.push({
          x: parseInt(textMatch[1]),
          y: parseInt(textMatch[2]),
          width: parseInt(textMatch[3]) * 10, // примерная ширина символа
          height: parseInt(textMatch[4]) * 15, // примерная высота символа  
          type: 'text'
        });
        continue;
      }
      
      // Прямоугольник
      const rectMatch = trimmed.match(/^R(\d+),(\d+),(\d+),(\d+),/);
      if (rectMatch) {
        coords.push({
          x: parseInt(rectMatch[1]),
          y: parseInt(rectMatch[2]),
          width: parseInt(rectMatch[3]) - parseInt(rectMatch[1]),
          height: parseInt(rectMatch[4]) - parseInt(rectMatch[2]),
          type: 'rectangle'
        });
        continue;
      }
      
      // Штрих-код
      const barcodeMatch = trimmed.match(/^B(\d+),(\d+),/);
      if (barcodeMatch) {
        coords.push({
          x: parseInt(barcodeMatch[1]),
          y: parseInt(barcodeMatch[2]),
          width: 100, // примерная ширина штрих-кода
          height: 50,  // примерная высота штрих-кода
          type: 'barcode'
        });
      }
    }
    
    return coords;
  }
  
  private findOverlappingElements(coordinates: Array<{x: number, y: number, width?: number, height?: number, type: string}>): string[] {
    const overlaps: string[] = [];
    
    for (let i = 0; i < coordinates.length; i++) {
      for (let j = i + 1; j < coordinates.length; j++) {
        const a = coordinates[i];
        const b = coordinates[j];
        
        if (a.width && a.height && b.width && b.height) {
          // Проверяем пересечение прямоугольников
          if (a.x < b.x + b.width &&
              a.x + a.width > b.x &&
              a.y < b.y + b.height &&
              a.y + a.height > b.y) {
            overlaps.push(`${a.type} at (${a.x},${a.y}) overlaps with ${b.type} at (${b.x},${b.y})`);
          }
        }
      }
    }
    
    return overlaps;
  }
  
  private checkElementDensity(coordinates: Array<{x: number, y: number, width?: number, height?: number, type: string}>): string[] {
    const issues: string[] = [];
    
    // Группируем элементы по областям 100x100 точек
    const areas: {[key: string]: number} = {};
    
    for (const coord of coordinates) {
      const areaX = Math.floor(coord.x / 100);
      const areaY = Math.floor(coord.y / 100);
      const areaKey = `${areaX},${areaY}`;
      
      areas[areaKey] = (areas[areaKey] || 0) + 1;
    }
    
    // Проверяем перегруженные области
    for (const [area, count] of Object.entries(areas)) {
      if (count > 5) {
        issues.push(`Слишком много элементов (${count}) в области ${area}`);
      }
    }
    
    return issues;
  }
}