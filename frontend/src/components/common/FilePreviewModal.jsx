import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Loader2, Download, ExternalLink } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getAbsoluteFileUrl, isWordDoc, isTextFile, isPdf } from '../../utils/fileUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const FilePreviewModal = ({ file, onClose }) => {
    const navigate = useNavigate();
    const docxRef = useRef(null);
    const pdfContainerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [textContent, setTextContent] = useState('');
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [renderError, setRenderError] = useState(null);

    const fileUrl = `${getAbsoluteFileUrl(file.file_url)}${file.file_url.includes('?') ? '&' : '?'}preview=true&token=${localStorage.getItem('token')}&_cb=${Date.now()}`;
    const downloadUrl = fileUrl.replace('preview=true', 'preview=false');

    const isPdfFile = isPdf(file.mimetype) || file.file_name.toLowerCase().endsWith('.pdf');
    const isWord = isWordDoc(file.mimetype);
    const isText = isTextFile(file.mimetype);
    const isImage = file.mimetype?.startsWith('image/');

    // Render a single PDF page
    const renderPdfPage = useCallback(async (doc, pageNum) => {
        if (!doc || !pdfContainerRef.current) return;
        try {
            const page = await doc.getPage(pageNum);
            // Use container width or fallback to 800
            const container = pdfContainerRef.current;
            const containerWidth = Math.max(container.offsetWidth || 800, 300);
            const unscaledViewport = page.getViewport({ scale: 1 });
            const scale = Math.min((containerWidth * 0.9) / unscaledViewport.width, 2.5);
            const viewport = page.getViewport({ scale });

            // Clear old canvas
            container.innerHTML = '';

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            canvas.style.display = 'block';
            canvas.style.margin = '16px auto';
            canvas.style.boxShadow = '0 2px 16px rgba(0,0,0,0.1)';
            canvas.style.borderRadius = '4px';
            canvas.style.backgroundColor = '#fff';
            container.appendChild(canvas);

            await page.render({ canvasContext: ctx, viewport }).promise;
        } catch (err) {
            console.error('PDF render error:', err);
            setRenderError('Failed to render PDF page');
        }
    }, []);

    // Load content
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setRenderError(null);
            try {
                if (isPdfFile) {
                    const response = await fetch(fileUrl);
                    if (!response.ok) throw new Error(`Server returned ${response.status}`);
                    const data = await response.arrayBuffer();
                    if (cancelled) return;
                    const doc = await pdfjsLib.getDocument({ data }).promise;
                    if (cancelled) return;
                    setPdfDoc(doc);
                    setTotalPages(doc.numPages);
                    setCurrentPage(1);
                } else if (isWord) {
                    const { renderAsync } = await import('docx-preview');
                    const response = await fetch(fileUrl);
                    const blob = await response.blob();
                    if (cancelled || !docxRef.current) return;
                    docxRef.current.innerHTML = '';
                    await renderAsync(blob, docxRef.current, undefined, { inWrapper: false });
                } else if (isText) {
                    const response = await fetch(fileUrl);
                    const text = await response.text();
                    if (!cancelled) setTextContent(text);
                }
            } catch (err) {
                console.error('Load error:', err);
                if (!cancelled) setRenderError(err.message);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        if (file) load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    // Render PDF page when doc/page changes
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-6xl h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-800 truncate max-w-[200px] md:max-w-lg">{file.file_name}</h3>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {file.mimetype}
                                {isPdfFile && totalPages > 0 && ` · Page ${currentPage} of ${totalPages}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {isPdfFile && totalPages > 1 && (
                            <div className="hidden md:flex items-center gap-1 mr-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">← Prev</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded disabled:opacity-30">Next →</button>
                            </div>
                        )}

                        <button onClick={openFullViewer} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Open Full Viewer">
                            <ExternalLink className="w-3.5 h-3.5" /> Full View
                        </button>

                        <a href={downloadUrl} download className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" title="Download">
                            <Download className="w-4 h-4" />
                        </a>

                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors" title="Close">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-slate-100 relative" style={{ minHeight: 0 }}>
                    {isLoading && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                            <p className="text-xs font-medium text-slate-400">Rendering document...</p>
                        </div>
                    )}

                    {renderError && !isLoading && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center p-8 bg-white rounded-xl border border-slate-200 max-w-sm">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <h4 className="font-semibold text-slate-800">Preview Error</h4>
                                <p className="text-sm text-slate-500 mt-1">{renderError}</p>
                                <a href={downloadUrl} download className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                                    <Download className="w-3 h-3" /> Download Instead
                                </a>
                            </div>
                        </div>
                    )}

                    {isImage && (
                        <div className="w-full h-full flex items-center justify-center p-6">
                            <img src={fileUrl} alt={file.file_name} className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
                        </div>
                    )}

                    {isPdfFile && (
                        <div ref={pdfContainerRef} className="w-full min-h-full p-4" style={{ minHeight: '200px' }} />
                    )}

                    {isWord && (
                        <div ref={docxRef} className="w-full min-h-full p-4 md:p-8 bg-white docx-preview-container" />
                    )}

                    {isText && (
                        <div className="w-full p-6 md:p-10">
                            <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                                <pre className="text-sm font-mono text-slate-700 leading-relaxed whitespace-pre-wrap">{textContent}</pre>
                            </div>
                        </div>
                    )}

                    {!isImage && !isPdfFile && !isWord && !isText && !isLoading && !renderError && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center p-8 bg-white rounded-xl border border-slate-200 max-w-sm">
                                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <h4 className="font-semibold text-slate-800">Preview Unavailable</h4>
                                <p className="text-sm text-slate-500 mt-1">This file type cannot be previewed.</p>
                                <a href={downloadUrl} download className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                                    <Download className="w-3 h-3" /> Download to View
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
