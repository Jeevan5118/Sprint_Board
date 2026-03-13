import { useState } from 'react';
import api from '../api/axios';
import { UploadCloud, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

const AdminImport = () => {
    const [file, setFile] = useState(null);
    const [importType, setImportType] = useState('tasks');
    const [isUploading, setIsUploading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setResults(null);
            setError('');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a CSV, Excel, or PDF file to upload.');
            return;
        }
        setIsUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('import_type', importType);

        try {
            const { data } = await api.post('/admin/import/csv', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResults(data.data);
        } catch (err) {
            console.error('Upload failed:', err);
            setError(err.response?.data?.message || 'Failed to process CSV file. Ensure the file matches the selected type.');
        } finally {
            setIsUploading(false);
        }
    };

    const importHelp = {
        employees: 'Format: name, email, team, role (optional). Supports CSV, Excel, and PDF.',
        teams: 'Format: name, description (optional). Setup your organizational structure.',
        projects: 'Format: name, team, description (optional). Group your work by projects.',
        tasks: 'Format: title, assignee_email, team, description (optional). Batch create tasks.',
        automate: 'Master Setup: Setup Accounts, Teams, Projects, and Tasks. Supports CSV, XLSX, and PDF.'
    };

    const csvTemplates = {
        automate: [
            { header: 'employee_name', desc: 'Full name of the member' },
            { header: 'mail', desc: 'Login email (or "employee_email")' },
            { header: 'password', desc: 'Initial login password' },
            { header: 'team', desc: 'Team name to assign to' },
            { header: 'project', desc: 'Project name (Optional)' },
            { header: 'task_title', desc: 'Task to create (Optional)' },
            { header: 'task_priority', desc: 'Urgent, High, Medium, Low' },
        ],
        employees: [
            { header: 'employee_name', desc: 'Full name' },
            { header: 'mail', desc: 'Email address' },
            { header: 'team', desc: 'Team name' },
            { header: 'role', desc: 'Admin, Team Lead, or Member' },
            { header: 'password', desc: 'Custom password (Optional)' },
        ],
        tasks: [
            { header: 'title', desc: 'Task heading' },
            { header: 'team', desc: 'Associated team' },
            { header: 'mail', desc: 'Assignee email' },
            { header: 'project', desc: 'Project name' },
        ]
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Bulk Import</h1>
                <p className="text-sm text-slate-500 mt-1">Populate your workspace in seconds using CSV data.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <form onSubmit={handleUpload} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Import Type</label>
                                <select
                                    value={importType}
                                    onChange={(e) => setImportType(e.target.value)}
                                    className="input-field w-full"
                                >
                                    <option value="automate">Master (Accounts + Teams + Tasks) ⭐</option>
                                    <option value="employees">New Accounts / Members</option>
                                    <option value="teams">Teams structure</option>
                                    <option value="projects">Projects structure</option>
                                    <option value="tasks">Bulk Task Creation</option>
                                </select>
                                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                    <p className="text-[11px] text-indigo-700 font-medium uppercase tracking-wider mb-1">PRO TIP</p>
                                    <p className="text-sm text-indigo-900">{importHelp[importType]}</p>
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".csv, .xlsx, .xls, .pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                    <UploadCloud className="w-8 h-8 text-primary-blue" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900">Click to upload or drag and drop</h3>
                                <p className="text-xs text-slate-500 mt-1 font-mono">{file ? file.name : 'your_data.csv / .xlsx / .pdf'}</p>
                            </div>

                            {error && (
                                <div className="p-4 bg-danger-red/10 text-danger-red rounded-lg border border-danger-red/20 text-sm flex items-center">
                                    <AlertTriangle className="w-5 h-5 mr-3" /> {error}
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={!file || isUploading} className="btn-primary flex items-center shadow-lg shadow-primary-blue/20">
                                    {isUploading ? (
                                        <> <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> Processing... </>
                                    ) : (
                                        <> <CheckCircle className="w-4 h-4 mr-2" /> Start Processing </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {results && (
                        <div className="space-y-6">
                            <div className="card bg-slate-50 border-slate-200 animate-in slide-in-from-bottom duration-500 overflow-hidden">
                                <div className="p-6 text-center border-b border-slate-200">
                                    <div className="w-12 h-12 bg-success-green/10 text-success-green rounded-full flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-lg font-bold text-slate-900">Import Conclusion</h2>
                                </div>
                                <div className="grid grid-cols-3 divide-x divide-slate-200">
                                    <div className="p-6 text-center">
                                        <p className="text-2xl font-black text-success-green">{results.created}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Created</p>
                                    </div>
                                    <div className="p-6 text-center">
                                        <p className="text-2xl font-black text-amber-500">{results.skipped}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Skipped</p>
                                    </div>
                                    <div className="p-6 text-center">
                                        <p className="text-2xl font-black text-rose-500">{results.failed}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Failed</p>
                                    </div>
                                </div>
                            </div>

                            {results.errors && results.errors.length > 0 && (
                                <div className="card border-rose-200 bg-rose-50/30">
                                    <div className="flex items-center mb-3">
                                        <AlertTriangle className="w-4 h-4 text-rose-500 mr-2" />
                                        <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider">Failed Rows Detail</h3>
                                    </div>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {results.errors.map((err, idx) => (
                                            <div key={idx} className="text-xs text-rose-700 bg-rose-100/50 p-2 rounded border border-rose-200/50 font-mono">
                                                {err}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="card bg-slate-900 text-white border-0 shadow-xl overflow-hidden">
                        <div className="p-4 bg-slate-800 flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-primary-blue" />
                            <span className="text-xs font-bold uppercase tracking-widest">CSV Format Guide</span>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-xs text-slate-400">Ensure your CSV has these exact column names for <span className="text-white font-bold">{importType === 'automate' ? 'Master' : importType}</span> import:</p>
                            <div className="space-y-2">
                                {(csvTemplates[importType] || csvTemplates.automate).map((col, i) => (
                                    <div key={i} className="flex flex-col border-b border-slate-800 pb-2 mb-2 last:border-0">
                                        <code className="text-primary-blue text-[11px] font-bold">{col.header}</code>
                                        <span className="text-[10px] text-slate-500">{col.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-5 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-[11px] font-black text-amber-800 uppercase mb-2">Notice</p>
                        <p className="text-xs text-amber-900 leading-relaxed">
                            UTF-8 encoding is required for CSV. First row must contain column headers. If no password is provided,
                            <code className="mx-1 bg-amber-100 px-1 rounded">Password@123</code> will be used.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminImport;
