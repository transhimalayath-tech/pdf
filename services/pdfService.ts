import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';

// Robustly resolve the PDF.js module object
// Depending on the CDN and bundling, the exports might be on 'default' or top-level.
const pdfjs: any = (pdfjsLib as any).default || pdfjsLib;

// Ensure GlobalWorkerOptions is available on the object we are using
if (!pdfjs.GlobalWorkerOptions && (pdfjsLib as any).GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions = (pdfjsLib as any).GlobalWorkerOptions;
}

// Initialize PDF.js worker
// Using jsDelivr to match the main library import in index.html.
// This ensures version consistency and avoids mismatches between the API and the Worker.
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

export const getPdfDocument = async (url: string) => {
  try {
    // We pass cMapUrl and cMapPacked to ensure fonts load correctly.
    // Using jsDelivr for cMaps as well.
    const loadingTask = pdfjs.getDocument({
      url,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    return await loadingTask.promise;
  } catch (error) {
    console.error("PDF Loading failed:", error);
    throw new Error(`Failed to load PDF document: ${error instanceof Error ? error.message : String(error)}`);
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