export const PRINTER_TEMPLATES = {
  PELMENI: 'template_pelmeni',
  BLINI: 'template_blini',
  VARENIKI: 'template_vareniki',
  MANTY: 'template_manty',
  UNIVERSAL: 'template_universal',
} as const;

export const STICKER_MAPPING = {
  'פלמני': PRINTER_TEMPLATES.PELMENI,
  'פלמני קלאסיים': PRINTER_TEMPLATES.PELMENI,
  'בלינים': PRINTER_TEMPLATES.BLINI,
  'בלינים דקים': PRINTER_TEMPLATES.BLINI,
  'ורניקים': PRINTER_TEMPLATES.VARENIKI,
  'מנטי': PRINTER_TEMPLATES.MANTY,
  'default': PRINTER_TEMPLATES.UNIVERSAL,
} as const;

export const PRINTER_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  READY: 'ready',
  BUSY: 'busy',
  ERROR: 'error',
} as const;

export const ZPL_COMMANDS = {
  START: '^XA',
  END: '^XZ',
  FIELD_ORIGIN: '^FO',
  FIELD_DATA: '^FD',
  FIELD_SEPARATOR: '^FS',
  BARCODE: '^BC',
  FONT: '^A',
} as const;