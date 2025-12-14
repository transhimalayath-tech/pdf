export interface PdfFile {
  name: string;
  url: string; // Blob URL
}

export interface TextItem {
  str: string;
  dir: string;
  width: number;
  height: number;
  transform: number[];
  fontName: string;
  hasEncoding: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum AiAction {
  SUMMARIZE = 'Summarize',
  FIX_GRAMMAR = 'Fix Grammar',
  PROFESSIONAL = 'Make Professional',
  SIMPLIFY = 'Simplify',
  EXPAND = 'Expand',
  TRANSLATE_ES = 'Translate to Spanish',
  TRANSLATE_FR = 'Translate to French'
}
