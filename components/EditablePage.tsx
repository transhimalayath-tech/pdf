import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from '../types';

interface EditablePageProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  scale: number;
  onTextChange: (pageNumber: number, newText: string) => void;
}

export const EditablePage: React.FC<EditablePageProps> = ({ 
  pageNumber, 
  pdfDoc, 
  scale,
  onTextChange 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [viewport, setViewport] = useState<any>(null);
  
  // Track which item is currently being edited
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!canvasRef.current || !pdfDoc) return;

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const vp = page.getViewport({ scale });
        setViewport(vp);

        // Render Canvas (Background)
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (context) {
          canvas.height = vp.height;
          canvas.width = vp.width;
          
          const renderContext = {
            canvasContext: context,
            viewport: vp,
          };
          
          await page.render(renderContext as any).promise;
        }

        // Get Text Content
        const textContent = await page.getTextContent();
        if (!isCancelled) {
          const items = textContent.items as unknown as TextItem[];
          setTextItems(items);
          
          // Construct initial full text for this page for the parent to track
          const fullPageText = items.map(item => item.str).join(' ');
          onTextChange(pageNumber, fullPageText);
        }

      } catch (error) {
        console.error(`Error rendering page ${pageNumber}`, error);
      }
    };

    renderPage();

    return () => { isCancelled = true; };
  }, [pdfDoc, pageNumber, scale]); 

  const handleItemChange = (index: number, newValue: string) => {
    const newItems = [...textItems];
    newItems[index] = { ...newItems[index], str: newValue };
    setTextItems(newItems);
    
    const fullPageText = newItems.map(item => item.str).join(' ');
    onTextChange(pageNumber, fullPageText);
  };

  const handleItemClick = (index: number) => {
    // Check if user is selecting text (dragging). If so, don't enter edit mode.
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    setEditingIndex(index);
  };

  if (!viewport) return (
    <div className="w-full h-96 mb-8 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-700">
        <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-400 text-sm">Rendering Page {pageNumber}...</span>
        </div>
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className="relative mb-8 shadow-2xl bg-white mx-auto transition-all duration-200"
      style={{ 
        width: viewport.width, 
        height: viewport.height,
      }}
    >
      {/* Background Canvas: The PDF Visuals */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none"
      />

      {/* Text Layer */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        {textItems.map((item, idx) => {
          // PDF coordinates transformation
          const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
          const fontSize = item.transform[0] * scale;
          const fontHeight = fontSize; 
          const top = y - fontHeight; 

          const isEditing = editingIndex === idx;

          const commonStyle: React.CSSProperties = {
            left: x,
            top: top,
            fontSize: `${fontSize}px`,
            fontFamily: item.fontName || 'sans-serif',
            backgroundColor: isEditing ? 'white' : 'transparent', // Transparent when not editing
            color: isEditing ? 'black' : 'transparent', // Transparent text normally (so you see the canvas), but selectable
            minWidth: '5px',
            position: 'absolute',
            whiteSpace: 'pre',
            lineHeight: 1,
            padding: '0 2px',
            borderRadius: '2px',
            cursor: 'text'
          };
          
          // To make text visible for selection but invisible to the eye (so we see the perfect canvas rendering underneath),
          // we typically use color: transparent with ::selection styling.
          // However, for this editor, we might want to overlay the actual text for better interaction.
          // Let's use a semi-transparent approach or just render the text on top so it matches the canvas.
          // Given the requirement is "Edit PDF", rendering the text elements on top is safer for interaction.
          
          const itemStyle: React.CSSProperties = {
            ...commonStyle,
            color: isEditing ? 'black' : 'rgba(0,0,0,0)', // Invisible but selectable text
            // We can add a subtle hover effect to show it's interactive
          };

          if (isEditing) {
             return (
                <div
                  key={idx}
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) => {
                      handleItemChange(idx, e.currentTarget.innerText);
                      setEditingIndex(null);
                  }}
                  className="z-20 ring-2 ring-blue-500 outline-none cursor-text select-text bg-white text-black"
                  style={{...commonStyle, color: 'black', backgroundColor: 'white'}}
                  ref={(el) => {
                      if (el && document.activeElement !== el) {
                          el.focus();
                          const range = document.createRange();
                          range.selectNodeContents(el);
                          range.collapse(false);
                          const sel = window.getSelection();
                          sel?.removeAllRanges();
                          sel?.addRange(range);
                      }
                  }}
                >
                  {item.str}
                </div>
             );
          }

          return (
            <div
              key={idx}
              onClick={() => handleItemClick(idx)}
              className="group absolute hover:bg-blue-500/10 select-text"
              style={itemStyle}
              title="Click to edit"
            >
              {/* We render the text transparently so native selection works on it, 
                  but the visual comes from the canvas below for perfect fidelity until edited. 
                  When selected, the browser highlights the transparent text. */}
              {item.str}
            </div>
          );
        })}
      </div>
    </div>
  );
};