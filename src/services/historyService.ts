import type { QueryHistoryItem, SqlSnippet } from '../types/database';

const HISTORY_STORAGE_KEY = 'exagrid_query_history_v1';
const SNIPPETS_STORAGE_KEY = 'exagrid_sql_snippets_v1';
const MAX_HISTORY_ITEMS = 150;

const DEFAULT_SNIPPETS: SqlSnippet[] = [
  {
    id: 'snip-1',
    title: 'Top 10 Largest Tables (Storage)',
    description: 'Find tables taking the most disk space in MySQL',
    category: 'Monitoring',
    sql: `SELECT 
  table_name AS 'Table',
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Total Size (MB)',
  ROUND((data_length / 1024 / 1024), 2) AS 'Data (MB)',
  ROUND((index_length / 1024 / 1024), 2) AS 'Index (MB)',
  table_rows AS 'Rows'
FROM information_schema.TABLES
WHERE table_schema = DATABASE()
ORDER BY (data_length + index_length) DESC
LIMIT 10;`,
  },
  {
    id: 'snip-2',
    title: 'Find Running Queries (Active Threads)',
    description: 'View currently running slow queries and states',
    category: 'Performance',
    sql: `SELECT 
  id, user, host, db, command, time, state, info 
FROM information_schema.processlist 
WHERE command != 'Sleep' 
ORDER BY time DESC;`,
  },
  {
    id: 'snip-3',
    title: 'Count Rows in All Tables',
    description: 'Aggregate row count estimate across current database',
    category: 'Analytics',
    sql: `SELECT 
  table_name, table_rows 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
ORDER BY table_rows DESC;`,
  },
  {
    id: 'snip-4',
    title: 'Find Duplicate Records Template',
    description: 'Find duplicate rows based on column grouping',
    category: 'Data Quality',
    sql: `SELECT 
  column_name, COUNT(*) AS count_duplicates 
FROM your_table_name 
GROUP BY column_name 
HAVING COUNT(*) > 1 
ORDER BY count_duplicates DESC;`,
  },
  {
    id: 'snip-5',
    title: 'Reset Table Auto Increment',
    description: 'Reset auto_increment counter to specific number',
    category: 'Administration',
    sql: `ALTER TABLE your_table_name AUTO_INCREMENT = 1;`,
  },
];

export const historyService = {
  getHistory: (): QueryHistoryItem[] => {
    try {
      const data = localStorage.getItem(HISTORY_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  addHistory: (item: Omit<QueryHistoryItem, 'id' | 'timestamp'>): QueryHistoryItem => {
    const newItem: QueryHistoryItem = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };

    try {
      const existing = historyService.getHistory();
      // Prepend and limit size
      const updated = [newItem, ...existing.filter((h) => h.sql !== item.sql)].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save query history to localStorage:', e);
    }

    return newItem;
  },

  clearHistory: (): void => {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear query history:', e);
    }
  },

  deleteHistoryItem: (id: string): void => {
    try {
      const existing = historyService.getHistory();
      const updated = existing.filter((h) => h.id !== id);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete history item:', e);
    }
  },

  getSnippets: (): SqlSnippet[] => {
    try {
      const data = localStorage.getItem(SNIPPETS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      // Initialize with defaults if empty
      localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(DEFAULT_SNIPPETS));
      return DEFAULT_SNIPPETS;
    } catch {
      return DEFAULT_SNIPPETS;
    }
  },

  saveSnippet: (snippet: Omit<SqlSnippet, 'id'> & { id?: string }): SqlSnippet => {
    const existing = historyService.getSnippets();
    const id = snippet.id || `snip-${Date.now()}`;
    const newSnippet: SqlSnippet = {
      ...snippet,
      id,
    };

    const idx = existing.findIndex((s) => s.id === id);
    let updated: SqlSnippet[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = newSnippet;
    } else {
      updated = [newSnippet, ...existing];
    }

    try {
      localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save snippet:', e);
    }

    return newSnippet;
  },

  deleteSnippet: (id: string): void => {
    try {
      const existing = historyService.getSnippets();
      const updated = existing.filter((s) => s.id !== id);
      localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to delete snippet:', e);
    }
  },
};
