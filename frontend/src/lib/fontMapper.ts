const FONT_MAP: Record<string, string> = {
  ArialMT: 'Arial, Helvetica, sans-serif',
  'Arial-BoldMT': 'Arial, Helvetica, sans-serif',
  'Arial-ItalicMT': 'Arial, Helvetica, sans-serif',
  'Arial-BoldItalicMT': 'Arial, Helvetica, sans-serif',
  Helvetica: 'Helvetica, Arial, sans-serif',
  'Helvetica-Bold': 'Helvetica, Arial, sans-serif',
  'Helvetica-Oblique': 'Helvetica, Arial, sans-serif',
  'Helvetica-BoldOblique': 'Helvetica, Arial, sans-serif',
  TimesNewRomanPSMT: '"Times New Roman", Times, serif',
  'TimesNewRomanPS-BoldMT': '"Times New Roman", Times, serif',
  'TimesNewRomanPS-ItalicMT': '"Times New Roman", Times, serif',
  'Times-Roman': '"Times New Roman", Times, serif',
  'Times-Bold': '"Times New Roman", Times, serif',
  'Times-Italic': '"Times New Roman", Times, serif',
  CourierNewPSMT: '"Courier New", Courier, monospace',
  'Courier-Bold': '"Courier New", Courier, monospace',
  Courier: '"Courier New", Courier, monospace',
  Calibri: 'Calibri, Arial, sans-serif',
  'Calibri-Bold': 'Calibri, Arial, sans-serif',
  'Calibri-Italic': 'Calibri, Arial, sans-serif',
  Cambria: 'Cambria, Georgia, serif',
  'CambriaMath': 'Cambria Math, Cambria, serif',
  Georgia: 'Georgia, serif',
  Verdana: 'Verdana, sans-serif',
  Tahoma: 'Tahoma, sans-serif',
  'Segoe UI': '"Segoe UI", Tahoma, sans-serif',
  'Trebuchet MS': '"Trebuchet MS", sans-serif',
  'Comic Sans MS': '"Comic Sans MS", cursive',
  Impact: 'Impact, sans-serif',
  'Lucida Console': '"Lucida Console", monospace',
  Consolas: 'Consolas, "Courier New", monospace',
  Symbol: 'Symbol, serif',
  'ZapfDingbats': 'ZapfDingbats, serif',
}

const KEYWORD_MAP: [RegExp, string][] = [
  [/arial/i, 'Arial, Helvetica, sans-serif'],
  [/helvetica/i, 'Helvetica, Arial, sans-serif'],
  [/times/i, '"Times New Roman", Times, serif'],
  [/courier/i, '"Courier New", Courier, monospace'],
  [/calibri/i, 'Calibri, Arial, sans-serif'],
  [/cambria/i, 'Cambria, Georgia, serif'],
  [/georgia/i, 'Georgia, serif'],
  [/verdana/i, 'Verdana, sans-serif'],
  [/tahoma/i, 'Tahoma, sans-serif'],
  [/segoe/i, '"Segoe UI", Tahoma, sans-serif'],
  [/trebuchet/i, '"Trebuchet MS", sans-serif'],
  [/garamond/i, 'Garamond, Georgia, serif'],
  [/palatino/i, '"Palatino Linotype", Palatino, serif'],
  [/book\s*antiqua/i, '"Book Antiqua", Palatino, serif'],
  [/consolas/i, 'Consolas, "Courier New", monospace'],
  [/lucida/i, '"Lucida Sans", sans-serif'],
  [/comic/i, '"Comic Sans MS", cursive'],
  [/mono/i, '"Courier New", Courier, monospace'],
]

export function mapPdfFontToCSS(pdfFontName: string): string {
  const cleaned = pdfFontName.replace(/^[A-Z]{6}\+/, '')

  if (FONT_MAP[cleaned]) return FONT_MAP[cleaned]

  for (const [pattern, css] of KEYWORD_MAP) {
    if (pattern.test(cleaned)) return css
  }

  return 'sans-serif'
}

export function isBoldFont(fontName: string): boolean {
  return /bold/i.test(fontName)
}

export function isItalicFont(fontName: string): boolean {
  return /italic|oblique/i.test(fontName)
}
