import { format, parseISO, isValid, addDays, subDays } from 'date-fns';

export const formatDate = (dateString: string, formatStr = 'dd.MM.yyyy'): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      throw new Error('Invalid date string');
    }
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export const formatDateTime = (dateString: string, formatStr = 'dd.MM.yyyy HH:mm'): string => {
  return formatDate(dateString, formatStr);
};

export const formatTime = (timeString: string, formatStr = 'HH:mm'): string => {
  try {
    // If timeString is in HH:MM:SS format, parse it
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeString;
  }
};

export const getCurrentDateString = (): string => {
  return new Date().toISOString();
};

export const getCurrentDateFormatted = (formatStr = 'dd.MM.yyyy'): string => {
  return format(new Date(), formatStr);
};

export const addDaysToDate = (dateString: string, days: number): string => {
  const date = parseISO(dateString);
  return addDays(date, days).toISOString();
};

export const subtractDaysFromDate = (dateString: string, days: number): string => {
  const date = parseISO(dateString);
  return subDays(date, days).toISOString();
};

export const isDateValid = (dateString: string): boolean => {
  try {
    const date = parseISO(dateString);
    return isValid(date);
  } catch {
    return false;
  }
};

export const compareDates = (date1: string, date2: string): number => {
  const d1 = parseISO(date1);
  const d2 = parseISO(date2);
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};

export const getDateRange = (days: number): { from: string; to: string } => {
  const now = new Date();
  const from = subDays(now, days).toISOString();
  const to = now.toISOString();
  
  return { from, to };
};