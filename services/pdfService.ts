import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`;

export const getPdfDocument = async (url: string) => {
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    return await loadingTask.promise;
  } catch (error) {
    console.error("PDF Loading failed:", error);
    throw new Error("Failed to load PDF document.");
  }
};

export const generatePdfFromContent = (pages: { text: string }[], filename: string = 'document.pdf') => {
  // Simple regeneration - real "editing" of binary PDF is too complex for browser-side only 
  // without heavy libraries. We generate a new PDF from the edited text.
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - (margin * 2);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  let cursorY = 20;
  const lineHeight = 6;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomMargin = 20;

  pages.forEach((page, index) => {
    if (index > 0) {
      doc.addPage();
      cursorY = 20;
    }

    // Attempt to split by newlines first to preserve paragraph structure if present
    const paragraphs = page.text.split('\n');
    
    paragraphs.forEach(paragraph => {
        const lines = doc.splitTextToSize(paragraph, maxWidth);
        for (let i = 0; i < lines.length; i++) {
            if (cursorY > pageHeight - bottomMargin) {
                doc.addPage();
                cursorY = 20;
            }
            doc.text(lines[i], margin, cursorY);
            cursorY += lineHeight;
        }
        // Add extra space after paragraph
        cursorY += lineHeight * 0.5; 
    });
  });

  doc.save(filename);
};
