import { useEffect, useRef, useState } from 'react';
import { X, FileText, Loader2, Download, ExternalLink } from 'lucide-react';

const isWordDoc = (mimetype) => {
    return mimetype?.includes('word') ||
        mimetype?.includes('officedocument.wordprocessingml') ||
        mimetype?.includes('msword');
};

const isTextFile = (mimetype) => {
    return mimetype?.includes('text/plain') || mimetype?.includes('application/json');
};

const getAbsoluteFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const apiBase = import.meta.env.VITE_API_URL || '';
    if (apiBase.startsWith('http')) {
        const root = apiBase.replace(/\/api\/v1$/, '').replace(/\/api$/, '');
        return `${root}${url}`;
    }
    return url;
};

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

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-primary-blue/5 text-primary-blue">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate max-w-[200px] md:max-w-md">{file.file_name}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{file.mimetype}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a href={fileUrl.replace('preview=true', 'preview=false')} download className="btn-ghost p-2 text-slate-400 hover:text-emerald-600" title="Download">
                            <Download className="w-5 h-5" />
                        </a>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Container */}
                <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center relative">
                    {file.mimetype.startsWith('image/') ? (
                        <img src={fileUrl} alt={file.file_name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg p-4" />
                    ) : file.mimetype === 'application/pdf' ? (
                        <iframe src={fileUrl} className="w-full h-full border-0" title={file.file_name}></iframe>
                    ) : isWordDoc(file.mimetype) ? (
                        <div className="w-full h-full bg-white overflow-hidden relative">
                            {isLoading && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                                    <Loader2 className="w-10 h-10 text-primary-blue animate-spin mb-4" />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Processing Document...</p>
                                </div>
                            )}
                            <div ref={docxRef} className="h-full overflow-y-auto p-8 docx-preview-container bg-slate-50"></div>
                        </div>
                    ) : isTextFile(file.mimetype) ? (
                        <div className="w-full h-full bg-white p-6 md:p-10 overflow-auto">
                            <pre className="text-sm font-mono text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {textContent}
                            </pre>
                        </div>
                    ) : (
                        <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-sm">
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-6">
                                <FileText className="w-10 h-10" />
                            </div>
                            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Preview Unavailable</h4>
                            <p className="text-sm text-slate-500 mt-2 font-medium">This file format is not supported for in-app viewing.</p>
                            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-center justify-center">
                                <a href={fileUrl.replace('preview=true', 'preview=false')} className="text-[11px] font-black text-primary-blue uppercase tracking-widest hover:underline flex items-center justify-center gap-2">
                                    Download to View <Download className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FilePreviewModal;
