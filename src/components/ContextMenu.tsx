import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  badge?: string;
}

export interface ContextMenuSection {
  header?: string;
  items: ContextMenuItem[];
}

export interface ContextMenuProps {
  x: number;
  y: number;
  sections: ContextMenuSection[];
  onClose: () => void;
  width?: number;
}

export const ContextMenu = ({
  x,
  y,
  sections,
  onClose,
  width = 224,
}: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Auto-clamp to screen boundaries so menu never renders off-screen
  const menuWidth = width;
  const menuEstimatedHeight = 320;

  const posX = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 12));
  const posY = Math.max(8, Math.min(y, window.innerHeight - menuEstimatedHeight - 12));

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Close on window resize or scroll
    const handleScrollOrResize = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${posX}px`,
        top: `${posY}px`,
        zIndex: 99999,
        width: `${menuWidth}px`,
      }}
      className="bg-slate-900/95 border border-slate-700/80 rounded-lg shadow-2xl backdrop-blur-md py-1 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-75"
    >
      {sections.map((section, sIdx) => (
        <div key={section.header || sIdx}>
          {section.header && (
            <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.header}
            </div>
          )}
          {section.items.map((item, iIdx) => (
            <button
              key={`${item.label}-${iIdx}`}
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!item.disabled) {
                  item.onClick();
                  onClose();
                }
              }}
              className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between rounded-md transition mx-auto cursor-pointer ${
                item.disabled
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : item.danger
                  ? 'text-rose-400 hover:bg-rose-950/50 hover:text-rose-200'
                  : 'text-slate-200 hover:bg-indigo-600 hover:text-white'
              }`}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <div className="flex items-center space-x-2 truncate">
                {item.icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] uppercase px-1 rounded bg-slate-800 text-slate-400 border border-slate-700/60 ml-2">
                  {item.badge}
                </span>
              )}
              {item.shortcut && (
                <span className="text-[10px] text-slate-500 font-mono ml-2">
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
          {sIdx < sections.length - 1 && (
            <div className="border-t border-slate-800/80 my-1" />
          )}
        </div>
      ))}
    </div>
  );
};
