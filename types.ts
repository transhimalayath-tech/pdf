export interface PdfFile {
  name: string;
  data: string; // Base64
  text: string; // Extracted text
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum EditorMode {
  EDIT = 'EDIT',
  CHAT = 'CHAT'
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
