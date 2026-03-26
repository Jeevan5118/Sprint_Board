import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Loader2, Download, ExternalLink } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { getAbsoluteFileUrl, isWordDoc, isTextFile, isPdf } from '../../utils/fileUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const FilePreviewModal = ({ file, onClose }) => {
    const navigate = useNavigate();
    const docxRef = useRef(null);
    const pdfCanvasRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [textContent, setTextContent] = useState('');
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    const fileUrl = `${getAbsoluteFileUrl(file.file_url)}${file.file_url.includes('?') ? '&' : '?'}preview=true&token=${localStorage.getItem('token')}&_cb=${Date.now()}`;
    const downloadUrl = fileUrl.replace('preview=true', 'preview=false');

    const isPdfFile = isPdf(file.mimetype) || file.file_name.toLowerCase().endsWith('.pdf');
    const isWord = isWordDoc(file.mimetype);
    const isText = isTextFile(file.mimetype);
    const isImage = file.mimetype?.startsWith('image/');

    // Render a PDF page to canvas
    const renderPdfPage = useCallback(async (doc, pageNum) => {
        if (!doc || !pdfCanvasRef.current) return;
        try {
            const page = await doc.getPage(pageNum);
            const container = pdfCanvasRef.current;
            const containerWidth = container.clientWidth || 800;
            const unscaledViewport = page.getViewport({ scale: 1 });
            const scale = (containerWidth - 32) / unscaledViewport.width;
            const viewport = page.getViewport({ scale: Math.min(scale, 2) });

            container.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
            canvas.style.maxWidth = '100%';
            container.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
        } catch (err) {
            console.error('PDF page render error:', err);
        }
    }, []);

    useEffect(() => {
        if (!file) return;
        let cancelled = false;

        const loadContent = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(fileUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                if (isPdfFile) {
                    const arrayBuffer = await response.arrayBuffer();
                    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    if (!cancelled) {
                        setPdfDoc(doc);
                        setTotalPages(doc.numPages);
                        setCurrentPage(1);
                        await renderPdfPage(doc, 1);
                    }
                } else if (isWord && docxRef.current) {
                    const { renderAsync } = await import('docx-preview');
                    docxRef.current.innerHTML = '';
                    const blob = await response.blob();
                    await renderAsync(blob, docxRef.current, undefined, { inWrapper: false });
                } else if (isText) {
                    const text = await response.text();
                    if (!cancelled) setTextContent(text);
                } else if (isImage) {
                    // Images load via <img> tag, nothing to do here
                }
            } catch (err) {
                console.error('Preview load error:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        loadContent();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    // Re-render when page changes
    useEffect(() => {
        if (pdfDoc && currentPage > 0) {
            renderPdfPage(pdfDoc, currentPage);
        }
    }, [pdfDoc, currentPage, renderPdfPage]);

    if (!file) return null;

    const openFullViewer = () => {
        const params = new URLSearchParams({
            url: fileUrl,
            name: file.file_name,
            type: file.mimetype || ''
        });
        navigate(`/viewer?${params.toString()}`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-[95%] h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white shrink-0 z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-primary-blue/10 text-primary-blue shrink-0">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-800 truncate max-w-[200px] md:max-w-lg">{file.file_name}</h3>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                {file.mimetype}
                                {isPdfFile && totalPages > 0 && ` • Page ${currentPage} of ${totalPages}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* PDF Page Nav */}
                        {isPdfFile && totalPages > 1 && (
                            <div className="hidden md:flex items-center gap-1 mr-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">
                                    ← Prev
                                </button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">
                                    Next →
                                </button>
                            </div>
                        )}

                        <button
                            onClick={openFullViewer}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Open Full Viewer"
                        >
                            <ExternalLink className="w-3.5 h-3.5" /> Full View
                        </button>

                        <a href={downloadUrl} download className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Download">
                            <Download className="w-4 h-4" />
                        </a>

                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Close">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-50 relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                            <Loader2 className="w-10 h-10 text-primary-blue animate-spin mb-3" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rendering document...</p>
                        </div>
                    )}

                    {isImage && (
                        <div className="w-full h-full flex items-center justify-center p-6">
                            <img src={fileUrl} alt={file.file_name} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                        </div>
                    )}

                    {isPdfFile && (
                        <div ref={pdfCanvasRef} className="w-full p-4 md:p-8" />
                    )}

                    {isWord && (
                        <div ref={docxRef} className="w-full p-4 md:p-8 bg-white docx-preview-container" />
                    )}

                    {isText && (
                        <div className="w-full p-6 md:p-12">
                            <div className="max-w-4xl mx-auto bg-white border border-slate-100 rounded-xl p-6 md:p-10 shadow-sm">
                                <pre className="text-sm font-mono text-slate-700 leading-relaxed whitespace-pre-wrap">{textContent}</pre>
                            </div>
                        </div>
                    )}

                    {!isImage && !isPdfFile && !isWord && !isText && !isLoading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm max-w-sm">
                                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-slate-800">Preview Unavailable</h4>
                                <p className="text-sm text-slate-500 mt-2">This file type is not supported for in-app viewing.</p>
                                <a href={downloadUrl} download className="btn-primary mt-6 inline-flex items-center gap-2 text-xs">
                                    <Download className="w-4 h-4" /> Download to View
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
