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
          
          // Fix for RenderParameters type error: Property 'canvas' is missing
          // We provide the canvas element and cast to any to satisfy potential type strictness
          // in recent pdfjs-dist versions.
          const renderContext = {
            canvasContext: context,
            viewport: vp,
            canvas: canvas
          };
          
          await page.render(renderContext as any).promise;
        }

        // Get Text Content
        const textContent = await page.getTextContent();
        if (!isCancelled) {
          // Cast to our TextItem type which matches the raw item structure mostly
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
  }, [pdfDoc, pageNumber, scale]); // Re-render if scale changes

  // Helper to update text in our local state and bubble up
  const handleItemChange = (index: number, newValue: string) => {
    const newItems = [...textItems];
    newItems[index] = { ...newItems[index], str: newValue };
    setTextItems(newItems);
    
    // Naive reconstruction of page text
    const fullPageText = newItems.map(item => item.str).join(' ');
    onTextChange(pageNumber, fullPageText);
  };

  if (!viewport) return <div className="animate-pulse bg-gray-200 w-full h-96 rounded mb-8"></div>;

  return (
    <div 
      ref={containerRef}
      className="relative mb-8 shadow-lg bg-white mx-auto transition-all duration-200"
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

      {/* Editable Overlay Layer */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        {textItems.map((item, idx) => {
          // PDF coordinates: (0,0) is bottom-left usually, but Viewport handles conversion
          // However, transform gives [scaleX, skewY, skewX, scaleY, x, y]
          // viewport.convertToViewportPoint gives [x, y] in canvas CSS pixels
          
          // Simple item positioning calculation based on standard PDF text rendering
          // Note: This is an approximation. PDF text rendering is complex.
          
          // We use the viewport to transform the PDF point (item.transform[4], item.transform[5])
          // transform[5] is Y from bottom.
          
          const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
          
          // The 'y' returned is the baseline. We need to adjust for top-left positioning if we use div.
          // Font size is roughly transform[0] * scale
          const fontSize = item.transform[0] * scale;
          const fontHeight = fontSize; // approximation
          
          // Adjust y to be 'top'
          const top = y - fontHeight; 

          return (
            <div
              key={idx}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleItemChange(idx, e.currentTarget.innerText)}
              className="absolute whitespace-pre leading-none hover:ring-1 hover:ring-blue-400 focus:ring-2 focus:ring-blue-500 focus:outline-none px-0.5 rounded cursor-text"
              style={{
                left: x,
                top: top,
                fontSize: `${fontSize}px`,
                fontFamily: item.fontName || 'sans-serif', // Mapping font names is hard, fallback
                // Hide original text by having a background. 
                // Using 90% opacity white helps it blend while obscuring the underlying text.
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                color: '#000',
                minWidth: '5px',
                // transform: `scale(${item.transform[0] / fontHeight}, 1)` // Sometimes needed for width stretch
              }}
            >
              {item.str}
            </div>
          );
        })}
      </div>
    </div>
  );
};