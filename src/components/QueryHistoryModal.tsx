import {
  AlertCircle,
  Bookmark,
  Check,
  Clock,
  Copy,
  ExternalLink,
  History,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { historyService } from '../services/historyService';
import type { QueryHistoryItem, SqlSnippet } from '../types/database';

interface QueryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQueryInEditor: (sql: string) => void;
}

const formatTimestamp = (ts: number): string => {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const QueryHistoryModal = ({
  isOpen,
  onClose,
  onOpenQueryInEditor,
}: QueryHistoryModalProps) => {
  const [activeTab, setActiveTab] = useState<'history' | 'snippets'>('history');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New snippet form state
  const [isAddingSnippet, setIsAddingSnippet] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Custom');
  const [newSql, setNewSql] = useState('');

  // Storage states
  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>(() =>
    historyService.getHistory()
  );
  const [snippets, setSnippets] = useState<SqlSnippet[]>(() => historyService.getSnippets());

  if (!isOpen) return null;

  const refreshHistory = () => {
    setHistoryItems(historyService.getHistory());
  };

  const refreshSnippets = () => {
    setSnippets(historyService.getSnippets());
  };

  const handleCopy = (id: string, sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all query history?')) {
      historyService.clearHistory();
      refreshHistory();
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    historyService.deleteHistoryItem(id);
    refreshHistory();
  };

  const handleSaveAsSnippet = (item: QueryHistoryItem) => {
    historyService.saveSnippet({
      title: item.sql.slice(0, 30).trim() || 'Saved Query',
      sql: item.sql,
      category: 'Saved from History',
    });
    refreshSnippets();
    setActiveTab('snippets');
  };

  const handleCreateSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSql.trim()) return;
    historyService.saveSnippet({
      title: newTitle.trim(),
      category: newCategory.trim() || 'General',
      sql: newSql.trim(),
    });
    setNewTitle('');
    setNewSql('');
    setIsAddingSnippet(false);
    refreshSnippets();
  };

  const handleDeleteSnippet = (id: string) => {
    if (confirm('Delete this saved snippet?')) {
      historyService.deleteSnippet(id);
      refreshSnippets();
    }
  };

  const filteredHistory = historyItems.filter(
    (h) =>
      h.sql.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.database?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sql.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Query History ({historyItems.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('snippets')}
                className={`px-3 py-1 rounded-md text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer ${
                  activeTab === 'snippets'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Saved Snippets ({snippets.length})</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === 'history' && historyItems.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-2.5 py-1 text-rose-400 hover:bg-rose-950/40 rounded-md text-xs font-medium border border-rose-900/40 transition cursor-pointer flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear History</span>
              </button>
            )}
            {activeTab === 'snippets' && !isAddingSnippet && (
              <button
                onClick={() => setIsAddingSnippet(true)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium transition cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>New Snippet</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/50 flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'history'
                  ? 'Search executed SQL statements...'
                  : 'Search snippets by title or SQL...'
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'history' && (
            <>
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-600" />
                  <p className="text-sm">No queries executed yet.</p>
                  <p className="text-xs text-slate-600">
                    Queries executed in the SQL Console will automatically appear here.
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition flex flex-col space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            item.status === 'success'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/60'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-900/60'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.database && (
                          <span className="bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 font-mono text-[10px]">
                            {item.database}
                          </span>
                        )}
                        <span>{item.duration_ms} ms</span>
                        {item.rows_affected !== undefined && (
                          <span>• {item.rows_affected} rows</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span>{formatTimestamp(item.timestamp)}</span>
                        <button
                          onClick={() => handleCopy(item.id, item.sql)}
                          title="Copy SQL"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleSaveAsSnippet(item)}
                          title="Bookmark as Snippet"
                          className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            onOpenQueryInEditor(item.sql);
                            onClose();
                          }}
                          title="Open in SQL Console"
                          className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          title="Delete from History"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <pre className="text-xs font-mono text-slate-200 bg-slate-900/80 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">
                      {item.sql}
                    </pre>

                    {item.error_message && (
                      <div className="text-[11px] text-rose-400 flex items-center space-x-1.5 font-mono">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{item.error_message}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'snippets' && (
            <>
              {isAddingSnippet && (
                <form
                  onSubmit={handleCreateSnippet}
                  className="p-4 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-3 mb-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-indigo-300 flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Create New SQL Bookmark</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingSnippet(false)}
                      className="text-slate-400 hover:text-slate-200 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Snippet Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Find Active Orders"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="e.g. Analytics, Administration"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      SQL Query
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newSql}
                      onChange={(e) => setNewSql(e.target.value)}
                      placeholder="SELECT * FROM ..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Save Snippet
                    </button>
                  </div>
                </form>
              )}

              {filteredSnippets.length === 0 ? (
                <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
                  <Bookmark className="w-8 h-8 text-slate-600" />
                  <p className="text-sm">No snippets found.</p>
                </div>
              ) : (
                filteredSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition flex flex-col space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs text-slate-200">{snippet.title}</span>
                        {snippet.category && (
                          <span className="bg-indigo-950/60 text-indigo-400 border border-indigo-900/60 px-1.5 py-0.5 rounded text-[10px] font-mono">
                            {snippet.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleCopy(snippet.id, snippet.sql)}
                          title="Copy SQL"
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        >
                          {copiedId === snippet.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            onOpenQueryInEditor(snippet.sql);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-xs font-medium flex items-center space-x-1 transition cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Run Query</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSnippet(snippet.id)}
                          title="Delete Snippet"
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {snippet.description && (
                      <p className="text-[11px] text-slate-400">{snippet.description}</p>
                    )}

                    <pre className="text-xs font-mono text-emerald-400/90 bg-slate-900/80 p-2.5 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed select-text">
                      {snippet.sql}
                    </pre>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
