import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { isWordDoc, isTextFile, isPdf } from '../utils/fileUtils';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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
    const isPdfFile = isPdf(mimeType) || fileName.toLowerCase().endsWith('.pdf');
    const isImage = mimeType.startsWith('image/');
    const isWord = isWordDoc(mimeType);
    const isText = isTextFile(mimeType);

    // Load PDF
    const loadPdf = useCallback(async () => {
        if (!fileUrl) return;
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error(`Server returned ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(doc);
            setTotalPages(doc.numPages);
            setCurrentPage(1);
        } catch (err) {
            console.error('PDF load error:', err);
            setError('Failed to load PDF. The file may be corrupted.');
        } finally {
            setIsLoading(false);
        }
    }, [fileUrl]);

    // Render one page
    const renderPage = useCallback(async (pageNum) => {
        if (!pdfDoc || !canvasContainerRef.current) return;
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale });
            const container = canvasContainerRef.current;
            container.innerHTML = '';

            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
            canvas.style.maxWidth = '100%';
            canvas.style.boxShadow = '0 2px 16px rgba(0,0,0,0.1)';
            canvas.style.borderRadius = '4px';
            canvas.style.backgroundColor = '#fff';
            container.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
        } catch (err) {
            console.error('Page render error:', err);
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

    // Load text
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
        if (isPdfFile) loadPdf();
        else if (isWord) loadWordDoc();
        else if (isText) loadTextFile();
        else if (isImage) setIsLoading(false);
        else { setError('This file type cannot be previewed.'); setIsLoading(false); }
    }, [isPdfFile, isWord, isText, isImage, loadPdf, loadWordDoc, loadTextFile]);

    // Re-render on page/scale change
    useEffect(() => {
        if (pdfDoc) renderPage(currentPage);
    }, [pdfDoc, currentPage, scale, renderPage]);

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-50 overscroll-none overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg" title="Go Back">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                            <FileText className="w-4 h-4" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-slate-800 truncate max-w-[200px] md:max-w-lg">{fileName}</h1>
                            <p className="text-[10px] text-slate-400">{mimeType || 'Document'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isPdfFile && totalPages > 0 && (
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1} className="p-1 hover:bg-white rounded disabled:opacity-30">
                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                            </button>
                            <span className="text-xs font-medium text-slate-600 min-w-[60px] text-center">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1 hover:bg-white rounded disabled:opacity-30">
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>
                    )}

                    {isPdfFile && (
                        <div className="hidden md:flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
                            <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 hover:bg-white rounded">
                                <ZoomOut className="w-4 h-4 text-slate-600" />
                            </button>
                            <span className="text-xs font-medium text-slate-600 min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1 hover:bg-white rounded">
                                <ZoomIn className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>
                    )}

                    <a href={downloadUrl} download className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <Download className="w-4 h-4" /> <span className="hidden sm:inline">Download</span>
                    </a>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center" style={{ minHeight: 0 }}>
                {isLoading && (
                    <div className="flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                        <p className="text-sm font-medium text-slate-400">Loading document...</p>
                    </div>
                )}

                {error && !isLoading && (
                    <div className="text-center p-8 bg-white rounded-xl border border-slate-200 max-w-sm self-center">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-semibold text-slate-800">{error}</h3>
                        <a href={downloadUrl} download className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                            <Download className="w-3 h-3" /> Download Instead
                        </a>
                    </div>
                )}

                {!isLoading && !error && isPdfFile && (
                    <div ref={canvasContainerRef} className="max-w-4xl w-full min-h-[400px] flex flex-col items-center" />
                )}

                {!isLoading && !error && isImage && (
                    <img src={fileUrl} alt={fileName} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-md self-center" />
                )}

                {!isLoading && !error && isWord && (
                    <div ref={canvasContainerRef} className="max-w-4xl w-full bg-white rounded-xl p-8 shadow-sm border border-slate-100 docx-preview-container" />
                )}

                {!isLoading && !error && isText && (
                    <div className="max-w-4xl w-full bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                        <pre className="text-sm font-mono text-slate-700 leading-relaxed whitespace-pre-wrap">{textContent}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileViewer;
