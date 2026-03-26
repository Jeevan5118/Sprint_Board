import { useEffect, useRef, useState } from 'react';
import { X, FileText, Loader2, Download, ExternalLink, Maximize2 } from 'lucide-react';
import { getAbsoluteFileUrl, isWordDoc, isTextFile, isPdf } from '../../utils/fileUtils';


const FilePreviewModal = ({ file, onClose }) => {
    const docxRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    const fileUrl = `${getAbsoluteFileUrl(file.file_url)}${file.file_url.includes('?') ? '&' : '?'}preview=true&token=${localStorage.getItem('token')}&_cb=${Date.now()}`;

    const [textContent, setTextContent] = useState('');

    useEffect(() => {
        const renderDoc = async () => {
            if (isWordDoc(file.mimetype) && docxRef.current) {
                setIsLoading(true);
                try {
                    const { renderAsync } = await import('docx-preview');
                    docxRef.current.innerHTML = '';
                    const response = await fetch(fileUrl);
                    if (!response.ok) throw new Error('Failed to fetch document');
                    const blob = await response.blob();
                    await renderAsync(blob, docxRef.current, undefined, { inWrapper: false });
                } catch (error) {
                    console.error('Preview Error:', error);
                } finally {
                    setIsLoading(false);
                }
            } else if (isTextFile(file.mimetype)) {
                setIsLoading(true);
                try {
                    const response = await fetch(fileUrl);
                    const text = await response.text();
                    setTextContent(text);
                } catch (error) {
                    console.error('Text Preview Error:', error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        if (file) renderDoc();
    }, [file, fileUrl]);

    if (!file) return null;

    const openInNewTab = () => {
        // Keep preview=true so the browser opens its native viewer instead of downloading
        window.open(fileUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative bg-white w-full max-w-[95%] h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
                {/* Header - Email Style */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0 z-10 shadow-sm">
                    <div className="flex items-center space-x-4">
                        <div className="p-2.5 rounded-xl bg-primary-blue/5 text-primary-blue shadow-inner">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight truncate max-w-[250px] md:max-w-xl">{file.file_name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{file.mimetype}</span>
                                <span className="text-[10px] font-bold text-slate-300 uppercase underline decoration-primary-blue/30 tracking-widest">Secure Browser View</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-3">
                        <button 
                            onClick={openInNewTab} 
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-black text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all uppercase tracking-widest"
                            title="Open in Full Browser Viewer"
                        >
                            <ExternalLink className="w-4 h-4" /> Full Preview
                        </button>
                        
                        <div className="w-px h-6 bg-slate-100 mx-1 hidden sm:block"></div>
                        
                        <a 
                            href={fileUrl.replace('preview=true', 'preview=false')} 
                            download 
                            className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" 
                            title="Save Locally"
                        >
                            <Download className="w-5 h-5" />
                        </a>
                        
                        <button 
                            onClick={onClose} 
                            className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            title="Dismiss"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Container - Edge to Edge */}
                <div className="flex-1 overflow-auto bg-slate-100/50 flex items-center justify-center relative group">
                    {file.mimetype.startsWith('image/') ? (
                        <div className="w-full h-full flex items-center justify-center p-4 md:p-12 overflow-auto">
                            <img src={fileUrl} alt={file.file_name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-500 hover:scale-[1.02]" />
                        </div>
                    ) : isPdf(file.mimetype) ? (
                        <div className="w-full h-full bg-white relative">
                            {/* Native Browser PDF Viewer Component */}
                            <iframe 
                                src={fileUrl} 
                                className="w-full h-full border-0 shadow-inner" 
                                title={file.file_name}
                                type="application/pdf"
                                loading="lazy"
                                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                            ></iframe>
                            
                            {/* Overlay Controls for PDF if needed */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={openInNewTab} className="bg-slate-900/90 text-white px-6 py-2.5 rounded-full hover:bg-slate-900 shadow-2xl backdrop-blur-md flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-white/10">
                                    <Maximize2 className="w-4 h-4" /> Expand to Full Tab
                                </button>
                            </div>
                        </div>
                    ) : isWordDoc(file.mimetype) ? (
                        <div className="w-full h-full bg-white overflow-hidden relative">
                            {isLoading && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
                                    <div className="relative w-16 h-16 mb-6">
                                        <div className="absolute inset-0 border-4 border-primary-blue/20 rounded-full"></div>
                                        <Loader2 className="absolute inset-0 w-16 h-16 text-primary-blue animate-spin" />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter animate-pulse">Initializing Document Engine...</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Parsing XML Structures</p>
                                </div>
                            )}
                            <div ref={docxRef} className="h-full overflow-y-auto p-4 md:p-12 docx-preview-container bg-slate-50/50 scroll-smooth"></div>
                        </div>
                    ) : isTextFile(file.mimetype) ? (
                        <div className="w-full h-full bg-white p-6 md:p-16 overflow-auto scroll-smooth">
                            <div className="max-w-4xl mx-auto bg-slate-50 border border-slate-100 rounded-3xl p-8 md:p-12 shadow-sm">
                                <pre className="text-sm font-mono text-slate-700 leading-relaxed whitespace-pre-wrap selection:bg-primary-blue/10">
                                    {textContent}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md animate-in slide-in-from-bottom-4 duration-500">
                            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-8 border border-slate-200">
                                <FileText className="w-12 h-12" />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Format Not Previewable</h4>
                            <p className="text-sm text-slate-500 mt-3 font-medium leading-relaxed">
                                We've identified this as a specialized file type. To view its content, please use your local system applications.
                            </p>
                            <div className="mt-10 flex flex-col gap-3">
                                <a href={fileUrl.replace('preview=true', 'preview=false')} className="btn-primary w-full py-3 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest group">
                                    <Download className="w-4 h-4 group-hover:animate-bounce" /> Download for Local View
                                </a>
                                <button onClick={onClose} className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                                    Return to Workspace
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
