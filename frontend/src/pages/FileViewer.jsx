import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { isWordDoc, isTextFile, isPdf } from '../utils/fileUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

const FileViewer = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const canvasContainerRef = useRef(null);

    const fileUrl = searchParams.get('url') || '';
    const fileName = searchParams.get('name') || 'Document';
    const mimeType = searchParams.get('type') || '';

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [scale, setScale] = useState(1.5);
    const [textContent, setTextContent] = useState('');

    const downloadUrl = fileUrl.replace('preview=true', 'preview=false');

    // Load PDF document
    const loadPdf = useCallback(async () => {
        if (!fileUrl) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(doc);
            setTotalPages(doc.numPages);
            setCurrentPage(1);
        } catch (err) {
            console.error('PDF Load Error:', err);
            setError('Failed to load PDF. The file may be corrupted or inaccessible.');
        } finally {
            setIsLoading(false);
        }
    }, [fileUrl]);

    // Render a single PDF page to canvas
    const renderPage = useCallback(async (pageNum) => {
        if (!pdfDoc || !canvasContainerRef.current) return;
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const container = canvasContainerRef.current;
            container.innerHTML = '';

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
            canvas.style.maxWidth = '100%';
            canvas.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12)';
            canvas.style.borderRadius = '4px';
            container.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
        } catch (err) {
            console.error('Page Render Error:', err);
        }
    }, [pdfDoc, scale]);

    // Load Word doc
    const loadWordDoc = useCallback(async () => {
        if (!fileUrl || !canvasContainerRef.current) return;
        setIsLoading(true);
        try {
            const { renderAsync } = await import('docx-preview');
            canvasContainerRef.current.innerHTML = '';
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            await renderAsync(blob, canvasContainerRef.current, undefined, { inWrapper: false });
        } catch {
            setError('Failed to load Word document.');
        } finally {
            setIsLoading(false);
        }
    }, [fileUrl]);

    // Load text file
    const loadTextFile = useCallback(async () => {
        if (!fileUrl) return;
        setIsLoading(true);
        try {
            const response = await fetch(fileUrl);
            setTextContent(await response.text());
        } catch {
            setError('Failed to load text file.');
        } finally {
            setIsLoading(false);
        }
    }, [fileUrl]);

    // Initial load
    useEffect(() => {
        const isPdfFile = isPdf(mimeType) || fileName.toLowerCase().endsWith('.pdf');
        const isWord = isWordDoc(mimeType);
        const isText = isTextFile(mimeType);
        const isImage = mimeType.startsWith('image/');

        if (isPdfFile) {
            loadPdf();
        } else if (isWord) {
            loadWordDoc();
        } else if (isText) {
            loadTextFile();
        } else if (isImage) {
            setIsLoading(false);
        } else {
            setError('This file type cannot be previewed.');
            setIsLoading(false);
        }
    }, [fileUrl, mimeType, fileName, loadPdf, loadWordDoc, loadTextFile]);

    // Re-render page when page/scale changes
    useEffect(() => {
        if (pdfDoc) renderPage(currentPage);
    }, [pdfDoc, currentPage, scale, renderPage]);

    const isPdfFile = isPdf(mimeType) || fileName.toLowerCase().endsWith('.pdf');
    const isImage = mimeType.startsWith('image/');

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Go Back">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary-blue/10 text-primary-blue">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-slate-800 truncate max-w-[200px] md:max-w-lg">{fileName}</h1>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{mimeType || 'Document'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* PDF Controls */}
                    {isPdfFile && totalPages > 0 && (
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-colors">
                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                            </button>
                            <span className="text-xs font-bold text-slate-600 min-w-[60px] text-center">
                                {currentPage} / {totalPages}
                            </span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-colors">
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>
                    )}

                    {isPdfFile && (
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 hover:bg-white rounded transition-colors">
                                <ZoomOut className="w-4 h-4 text-slate-600" />
                            </button>
                            <span className="text-xs font-bold text-slate-600 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1 hover:bg-white rounded transition-colors">
                                <ZoomIn className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>
                    )}

                    <a href={downloadUrl} download className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                        <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
                    </a>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-primary-blue animate-spin mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Loading document...</p>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
                        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-slate-800">{error}</h3>
                        <a href={downloadUrl} download className="btn-primary mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-wider">
                            <Download className="w-4 h-4" /> Download Instead
                        </a>
                    </div>
                )}

                {!isLoading && !error && isPdfFile && (
                    <div ref={canvasContainerRef} className="max-w-4xl w-full" />
                )}

                {!isLoading && !error && isImage && (
                    <div className="flex items-center justify-center w-full">
                        <img src={fileUrl} alt={fileName} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg" />
                    </div>
                )}

                {!isLoading && !error && isWordDoc(mimeType) && (
                    <div ref={canvasContainerRef} className="max-w-4xl w-full bg-white rounded-xl p-8 shadow-sm border border-slate-100 docx-preview-container" />
                )}

                {!isLoading && !error && isTextFile(mimeType) && (
                    <div className="max-w-4xl w-full bg-white rounded-xl p-8 shadow-sm border border-slate-100">
                        <pre className="text-sm font-mono text-slate-700 leading-relaxed whitespace-pre-wrap">{textContent}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileViewer;
