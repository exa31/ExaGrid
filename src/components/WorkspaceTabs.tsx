import { FileCode, Plus,Table2, X } from 'lucide-react';

import type { TabItem } from '../types/database';

interface WorkspaceTabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewQueryTab: () => void;
}

export const WorkspaceTabs = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewQueryTab,
}: WorkspaceTabsProps) => (
    <div className="h-10 bg-slate-950 border-b border-slate-800/80 flex items-center px-2 space-x-1 overflow-x-auto select-none shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`group flex items-center space-x-2 px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition border-b-2 ${
              isActive
                ? 'bg-slate-900 text-slate-100 border-indigo-500 shadow-xs'
                : 'bg-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200 border-transparent'
            }`}
          >
            {tab.type === 'query' ? (
              <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            ) : (
              <Table2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            )}
            <span className="truncate max-w-[140px] font-mono">{tab.title}</span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className="p-0.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-200 opacity-60 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onNewQueryTab}
        title="New Query Tab (Ctrl/Cmd+T)"
        className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-md transition"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
