import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, MessageSquare, Edit3, X, Zap, ChevronRight, ChevronLeft } from 'lucide-react';
import { PdfFile, ChatMessage, EditorMode, AiAction } from './types';
import { extractTextFromPdf, generatePdfFromText } from './services/pdfService';
import { chatWithDocument, performActionOnText } from './services/geminiService';
import { Button } from './components/Button';
import { EditorToolbar } from './components/EditorToolbar';
import { LoadingSpinner } from './components/LoadingSpinner';

const App: React.FC = () => {
  // Store file URL specifically for iframe display to avoid base64 issues
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [editorText, setEditorText] = useState('');
  const [mode, setMode] = useState<EditorMode>(EditorMode.EDIT);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Layout State
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const isResizing = useRef(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    setIsLoading(true);
    try {
      // Create Blob URL for display
      const url = URL.createObjectURL(file);
      setPdfUrl(url);

      const text = await extractTextFromPdf(file);
      
      setPdfFile({
        name: file.name,
        data: "", // We use pdfUrl for display now
        text: text
      });
      setEditorText(text); 
      setChatMessages([{
        id: 'welcome',
        role: 'model',
        text: `I've analyzed **${file.name}**. You can now edit the extracted text or ask me questions about the document!`,
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error(error);
      alert('Failed to process PDF. Please try another file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiAction = async (action: AiAction) => {
    if (!editorText.trim()) return;
    
    setIsAiProcessing(true);
    try {
      const result = await performActionOnText(editorText, action);
      setEditorText(result);
    } catch (error) {
      alert('AI processing failed.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !pdfFile) return;

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
      const history = chatMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const responseText = await chatWithDocument(userMsg.text, pdfFile.text, history);

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
    if (!editorText) return;
    generatePdfFromText(editorText, `edited_${pdfFile?.name || 'document'}.pdf`);
  };

  const startResize = () => {
    isResizing.current = true;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 20 && newWidth < 80) {
      setLeftPanelWidth(newWidth);
    }
  };

  const onMouseUp = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  };

  if (!pdfFile || !pdfUrl) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Gemini PDF Architect
            </h1>
            <p className="text-gray-400">
              Extract, Edit, and Reimagine your PDFs with AI.
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
                  <h3 className="text-lg font-medium text-white">Drop your PDF here</h3>
                  <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center text-sm text-gray-500">
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-gray-800 rounded-lg"><FileText size={16} /></div>
              <span>Extract Text</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-gray-800 rounded-lg"><Zap size={16} /></div>
              <span>AI Rewrite</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 bg-gray-800 rounded-lg"><MessageSquare size={16} /></div>
              <span>Chat with PDF</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-2">
          <FileText className="text-blue-500" size={20} />
          <span className="font-semibold text-gray-100 truncate max-w-[200px]">{pdfFile.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setPdfFile(null); setPdfUrl(null); }}
            icon={<X size={16} />}
          >
            Close
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleDownload}
            icon={<Download size={16} />}
          >
            Export PDF
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: PDF Viewer */}
        <div style={{ width: `${leftPanelWidth}%` }} className="h-full bg-gray-800 relative flex flex-col border-r border-gray-700">
           <div className="h-8 bg-gray-900 text-gray-400 text-xs flex items-center px-4 uppercase tracking-wider font-semibold border-b border-gray-700">
             Original Document
           </div>
           <div className="flex-1 w-full bg-gray-700 relative">
             <iframe 
               src={pdfUrl} 
               className="w-full h-full border-none" 
               title="PDF Viewer"
             />
             {isResizing.current && <div className="absolute inset-0 z-50 bg-transparent" />}
           </div>
        </div>

        {/* Resizer Handle */}
        <div 
          onMouseDown={startResize}
          className="w-1 bg-gray-900 hover:bg-blue-500 cursor-col-resize z-50 transition-colors flex items-center justify-center"
        >
          <div className="w-0.5 h-8 bg-gray-600 rounded-full" />
        </div>

        {/* Right Panel: Editor / Chat */}
        <div style={{ width: `${100 - leftPanelWidth}%` }} className="h-full flex flex-col bg-gray-900">
          
          {/* Right Panel Tabs */}
          <div className="h-10 flex border-b border-gray-700 bg-gray-800 shrink-0">
            <button 
              onClick={() => setMode(EditorMode.EDIT)}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                mode === EditorMode.EDIT 
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <Edit3 size={16} /> Document Editor
            </button>
            <button 
              onClick={() => setMode(EditorMode.CHAT)}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                mode === EditorMode.CHAT 
                ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-800' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <MessageSquare size={16} /> Assistant
            </button>
          </div>

          {/* Editor Mode */}
          {mode === EditorMode.EDIT && (
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-800/50">
              <EditorToolbar 
                onAction={handleAiAction} 
                isProcessing={isAiProcessing}
                onClear={() => setEditorText('')}
                onCopy={() => navigator.clipboard.writeText(editorText)}
              />
              
              {/* Document "Page" Container */}
              <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-gray-200/5">
                 <div className="relative w-full max-w-4xl min-h-[800px] h-fit bg-white text-gray-900 shadow-2xl rounded-sm">
                    {isAiProcessing && (
                      <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center backdrop-blur-sm">
                        <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-200 flex flex-col items-center gap-3">
                          <LoadingSpinner />
                          <span className="text-blue-600 font-medium animate-pulse">Gemini is rewriting...</span>
                        </div>
                      </div>
                    )}
                    <textarea 
                      className="w-full h-full min-h-[800px] p-12 bg-transparent resize-none focus:outline-none font-serif text-lg leading-relaxed text-gray-800 selection:bg-blue-200 selection:text-blue-900"
                      value={editorText}
                      onChange={(e) => setEditorText(e.target.value)}
                      placeholder="Extracted text will appear here..."
                      spellCheck={false}
                    />
                 </div>
              </div>
              
              <div className="h-6 bg-gray-800 text-gray-500 text-xs flex items-center px-4 border-t border-gray-700 justify-between shrink-0">
                <span>{editorText.length} characters</span>
                <span>A4 Layout Preview</span>
              </div>
            </div>
          )}

          {/* Chat Mode */}
          {mode === EditorMode.CHAT && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-gray-700 text-gray-100 rounded-bl-none border border-gray-600'
                      }`}
                    >
                      {msg.text.split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? 'mt-2' : ''}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
                {isAiProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-gray-700 rounded-2xl rounded-bl-none px-4 py-3 border border-gray-600">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-4 bg-gray-800 border-t border-gray-700">
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isAiProcessing && handleSendMessage()}
                    placeholder="Ask Gemini about the document..."
                    disabled={isAiProcessing}
                    className="w-full bg-gray-900 text-white pl-4 pr-12 py-3 rounded-xl border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder-gray-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isAiProcessing}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Zap size={20} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
