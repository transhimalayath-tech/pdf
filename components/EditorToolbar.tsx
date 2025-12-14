import React from 'react';
import { Button } from './Button';
import { AiAction } from '../types';
import { Wand2, Languages, FileText, CheckCheck, Minimize2, Maximize2 } from 'lucide-react';

interface EditorToolbarProps {
  onAction: (action: AiAction) => void;
  isProcessing: boolean;
  onClear: () => void;
  onCopy: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onAction, isProcessing, onClear, onCopy }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider mr-2">AI Tools</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onAction(AiAction.SUMMARIZE)}
          disabled={isProcessing}
          title="Summarize"
        >
          <Minimize2 size={16} />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onAction(AiAction.EXPAND)}
          disabled={isProcessing}
          title="Expand"
        >
          <Maximize2 size={16} />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onAction(AiAction.FIX_GRAMMAR)}
          disabled={isProcessing}
          title="Fix Grammar"
        >
          <CheckCheck size={16} />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onAction(AiAction.PROFESSIONAL)}
          disabled={isProcessing}
          title="Make Professional"
        >
          <Wand2 size={16} />
        </Button>
      </div>

      <div className="flex items-center gap-1 pr-2 border-r border-gray-700">
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider mr-2">Translate</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onAction(AiAction.TRANSLATE_ES)}
          disabled={isProcessing}
        >
          ES
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onAction(AiAction.TRANSLATE_FR)}
          disabled={isProcessing}
        >
          FR
        </Button>
      </div>

       <div className="flex items-center gap-1 ml-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCopy}
          title="Copy Text"
        >
          Copy
        </Button>
         <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClear}
          className="text-red-400 hover:text-red-300"
          title="Clear Editor"
        >
          Clear
        </Button>
       </div>
    </div>
  );
};
