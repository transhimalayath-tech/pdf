import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Extract the PDF.js object. 
// esm.sh typically provides the library as the default export, but we check both.
const pdfjs: any = (pdfjsLib as any).default ?? pdfjsLib;

// Configure the worker.
// We use cdnjs for the worker script because it serves the file with correct CORS headers
// and MIME types, which is critical for browser Worker instantiation.
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const getPdfDocument = async (url: string) => {
  try {
    // Configure loading task
    // We use cdnjs for standard font maps (CMaps) to ensure text extracts correctly.
    const loadingTask = pdfjs.getDocument({
      url,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true,
      enableXfa: true, // Attempt to handle XFA forms if present
    });

    const doc = await loadingTask.promise;
    return doc;
  } catch (error) {
    console.error("PDF Loading service failed:", error);
    // Rethrow with a user-friendly message
    throw new Error(`Could not parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const generatePdfFromContent = (pages: { text: string }[], filename: string = 'document.pdf') => {
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
        cursorY += lineHeight * 0.5; 
    });
  });

  doc.save(filename);
};