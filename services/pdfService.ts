import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Initialize PDF.js worker
// Using pdfjs-dist v4.10.38 which is very stable
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

export const extractTextFromPdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Loading the document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Improved extraction to preserve some structure
      let lastY: number | undefined;
      let pageText = '';
      
      const items = textContent.items as any[];
      
      // Sort items by Y (descending) then X (ascending) to ensure reading order
      // PDF coordinates usually have (0,0) at bottom-left, so higher Y is higher up the page
      items.sort((a, b) => {
        if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
            return b.transform[5] - a.transform[5]; // Top to bottom
        }
        return a.transform[4] - b.transform[4]; // Left to right
      });

      for (const item of items) {
        if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 10) {
            // Significant Y difference implies a new line/paragraph
            pageText += '\n';
        } else if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 100) {
             // Very large gap
             pageText += '\n\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
             pageText += ' ';
        }
        
        pageText += item.str;
        lastY = item.transform[5];
      }

      fullText += pageText + '\n\n';
    }

    return fullText;
  } catch (error) {
    console.error("PDF Extraction failed:", error);
    throw new Error(`Failed to extract text from PDF. Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generatePdfFromText = (text: string, filename: string = 'document.pdf') => {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  // splitTextToSize is good, but let's just use the text method with maxWidth which handles newlines better
  // However, explicit newlines in string need to be respected.
  
  const lines = doc.splitTextToSize(text, maxWidth);
  
  let cursorY = 20;
  const lineHeight = 6;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 20;

  for (let i = 0; i < lines.length; i++) {
    if (cursorY > pageHeight - bottomMargin) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(lines[i], margin, cursorY);
    cursorY += lineHeight;
  }

  doc.save(filename);
};
