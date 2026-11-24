import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Upload,
  X,
} from 'lucide-react';
import { useState } from 'react';

import type { ColumnMeta, DatabaseEngine } from '../types/database';

interface DataImportModalProps {
  isOpen: boolean;
  tableName: string;
  columns: ColumnMeta[];
  engine: DatabaseEngine;
  onClose: () => void;
  onImport: (columns: string[], rows: Record<string, any>[]) => Promise<number>;
}

export const DataImportModal = ({
  isOpen,
  tableName,
  columns,
  engine: _engine,
  onClose,
  onImport,
}: DataImportModalProps) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [rawText, setRawText] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const parseCsv = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      throw new Error('CSV must contain a header row and at least one data row.');
    }

    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim());
    const data: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.replace(/^["']|["']$/g, '').trim());
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] !== undefined ? parts[idx] : null;
      });
      data.push(row);
    }

    return { headers, data };
  };

  const parseJson = (text: string) => {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    if (arr.length === 0) throw new Error('JSON array is empty.');
    const headers = Object.keys(arr[0]);
    return { headers, data: arr };
  };

  const handleTextChange = (text: string) => {
    setRawText(text);
    setError(null);
    setSuccessCount(null);
    if (!text.trim()) {
      setParsedHeaders([]);
      setParsedRows([]);
      return;
    }

    try {
      if (format === 'csv') {
        const { headers, data } = parseCsv(text);
        setParsedHeaders(headers);
        setParsedRows(data);
      } else {
        const { headers, data } = parseJson(text);
        setParsedHeaders(headers);
        setParsedRows(data);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid format');
      setParsedHeaders([]);
      setParsedRows([]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isJson = file.name.endsWith('.json');
    setFormat(isJson ? 'json' : 'csv');

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      handleTextChange(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const count = await onImport(parsedHeaders, parsedRows);
      setSuccessCount(count);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Import Data</h3>
              <p className="text-xs text-slate-400 font-mono">Target Table: {tableName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-2 text-emerald-300 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Successfully imported {successCount} rows into {tableName}!</span>
            </div>
          )}

          {/* Format selection & File picker */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setFormat('csv');
                  handleTextChange(rawText);
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                  format === 'csv'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV Format</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormat('json');
                  handleTextChange(rawText);
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                  format === 'json'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>JSON Format</span>
              </button>
            </div>

            <label className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium cursor-pointer transition flex items-center space-x-1.5 border border-slate-700">
              <Upload className="w-3.5 h-3.5" />
              <span>Choose File...</span>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Paste or Edit Raw {format.toUpperCase()}
            </label>
            <textarea
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                format === 'csv'
                  ? 'name,email,role\nAlice,alice@example.com,developer\nBob,bob@example.com,designer'
                  : '[\n  { "name": "Alice", "email": "alice@example.com" },\n  { "name": "Bob", "email": "bob@example.com" }\n]'
              }
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition leading-relaxed resize-y"
            />
          </div>

          {/* Table Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Data Preview ({parsedRows.length} rows detected)
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  Showing first {Math.min(5, parsedRows.length)} rows
                </span>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-950 max-h-40">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                    <tr>
                      <th className="py-1.5 px-3 w-10 text-center">#</th>
                      {parsedHeaders.map((h) => {
                        const exists = columns.some((c) => c.name.toLowerCase() === h.toLowerCase());
                        return (
                          <th key={h} className="py-1.5 px-3">
                            <span className={exists ? 'text-emerald-400' : 'text-slate-300'}>
                              {h}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-1.5 px-3 text-center text-slate-600 text-[10px]">
                          {idx + 1}
                        </td>
                        {parsedHeaders.map((h) => (
                          <td key={h} className="py-1.5 px-3 truncate max-w-xs">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between shrink-0 bg-slate-950">
          <span className="text-xs text-slate-500 font-mono">
            {parsedRows.length > 0 ? `${parsedRows.length} rows ready to insert` : 'No data loaded'}
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || parsedRows.length === 0}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              {loading && (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>Import {parsedRows.length > 0 ? `${parsedRows.length} Records` : 'Data'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
