import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, MessageSquare, Zap, ZoomIn, ZoomOut, X } from 'lucide-react';
import { PdfFile, ChatMessage, AiAction } from './types';
import { getPdfDocument, generatePdfFromContent } from './services/pdfService';
import { chatWithDocument, performActionOnText } from './services/geminiService';
import { Button } from './components/Button';
import { EditorToolbar } from './components/EditorToolbar';
import { LoadingSpinner } from './components/LoadingSpinner';
import { EditablePage } from './components/EditablePage';

const App: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // PDFDocumentProxy
  const [pagesData, setPagesData] = useState<{ [key: number]: string }>({}); // pageNum -> text
  
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  // Chat / Assistant Overlay
  const [showAssistant, setShowAssistant] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (pdfFile?.url) URL.revokeObjectURL(pdfFile.url);
    };
  }, [pdfFile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    setIsLoading(true);
    try {
      const url = URL.createObjectURL(file);
      const doc = await getPdfDocument(url);
      
      setPdfFile({ name: file.name, url });
      setPdfDoc(doc);
      setPagesData({}); // Reset text data
      
      setChatMessages([{
        id: 'welcome',
        role: 'model',
        text: `I've analyzed **${file.name}**. You can edit the text directly on the pages below, or ask me for help!`,
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error(error);
      alert('Failed to process PDF. Please try another file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageTextChange = (pageNum: number, text: string) => {
    setPagesData(prev => ({ ...prev, [pageNum]: text }));
  };

  const handleAiAction = async (action: AiAction) => {
    // For global actions, we join all text. 
    // Note: Applying changes back to absolute positioned elements is extremely hard.
    // For this demo, we will show the result in the Assistant panel or Alert, 
    // as we cannot safely reflow the PDF layout automatically.
    
    const fullText = Object.values(pagesData).join('\n\n');
    if (!fullText.trim()) return;
    
    setIsAiProcessing(true);
    setShowAssistant(true); // Open assistant to show result
    
    // Add a system message that we are working
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'model',
      text: `Processing ${action}...`,
      timestamp: Date.now()
    }]);

    try {
      const result = await performActionOnText(fullText, action);
      
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `**Here is the result of ${action}:**\n\n${result}\n\n*Note: Due to the fixed layout of PDFs, I cannot automatically apply this large change to the document layout. You can copy this text and manually update specific sections if needed.*`,
        timestamp: Date.now()
      }]);
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Sorry, I encountered an error processing that request.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: chatInput,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiProcessing(true);

    try {
      const fullText = Object.values(pagesData).join('\n\n');
      const history = chatMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const responseText = await chatWithDocument(userMsg.text, fullText, history);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleDownload = () => {
    // Generate new PDF from the collected text
    const orderedText = [];
    if (pdfDoc) {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        orderedText.push({ text: pagesData[i] || "" });
      }
      generatePdfFromContent(orderedText, `edited_${pdfFile?.name || 'doc'}`);
    }
  };

  if (!pdfFile || !pdfDoc) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Gemini PDF Editor
            </h1>
            <p className="text-gray-400">
              Directly edit text on your PDF documents.
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-700 rounded-2xl p-12 bg-gray-800/50 hover:bg-gray-800 transition-colors group cursor-pointer relative">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-blue-400 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Drop PDF to Edit</h3>
                  <p className="text-sm text-gray-400 mt-1">Click to browse</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Top Header */}
      <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <FileText className="text-blue-500" size={24} />
             <div>
               <h1 className="font-bold text-gray-100 leading-tight truncate max-w-[200px]">{pdfFile.name}</h1>
               <p className="text-xs text-gray-400">{pdfDoc.numPages} pages</p>
             </div>
          </div>
          <div className="h-8 w-px bg-gray-700 mx-2" />
          <div className="flex items-center bg-gray-900 rounded-lg p-1 border border-gray-700">
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:text-white text-gray-400"><ZoomOut size={16} /></button>
            <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1 hover:text-white text-gray-400"><ZoomIn size={16} /></button>
          </div>
        </div>

        {/* Toolbar for Actions */}
        <div className="flex-1 flex justify-center px-4">
           <EditorToolbar 
              onAction={handleAiAction} 
              isProcessing={isAiProcessing} 
              onClear={() => {}} 
              onCopy={() => {}} 
           />
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant={showAssistant ? "primary" : "secondary"} 
            size="sm" 
            onClick={() => setShowAssistant(!showAssistant)}
            icon={<MessageSquare size={16} />}
          >
            Assistant
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleDownload}
            icon={<Download size={16} />}
          >
            Export
          </Button>
           <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setPdfFile(null); setPdfDoc(null); }}
            icon={<X size={16} />}
          >
            Close
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Canvas Scroll Area */}
        <div className="flex-1 overflow-auto bg-gray-900/50 p-8 flex flex-col items-center gap-8">
           {Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((pageNum) => (
             <EditablePage 
               key={pageNum}
               pageNumber={pageNum}
               pdfDoc={pdfDoc}
               scale={scale}
               onTextChange={handlePageTextChange}
             />
           ))}
        </div>

        {/* Assistant Panel (Overlay/Sidebar) */}
        {showAssistant && (
          <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col shadow-2xl z-40 absolute right-0 top-0 bottom-0">
             <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
               <h3 className="font-semibold text-white flex items-center gap-2">
                 <Zap size={16} className="text-yellow-400" /> AI Assistant
               </h3>
               <button onClick={() => setShowAssistant(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] rounded-xl px-4 py-3 text-sm shadow-sm ${
                        msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100 border border-gray-600'
                      }`}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
             </div>

             <div className="p-4 border-t border-gray-700 bg-gray-900">
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isAiProcessing && handleSendMessage()}
                    placeholder="Ask about the document..."
                    disabled={isAiProcessing}
                    className="w-full bg-gray-800 text-white pl-4 pr-10 py-2.5 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  />
                  <button onClick={handleSendMessage} disabled={!chatInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300">
                    <Zap size={18} />
                  </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
