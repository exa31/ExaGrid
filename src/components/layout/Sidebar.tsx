import { Link, useLocation } from 'react-router-dom'

interface SidebarProps {
  isSidebarOpen: boolean;
}

export default function Sidebar({ isSidebarOpen }: SidebarProps) {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <aside
      className={`bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col fixed inset-y-0 left-0 z-30 md:static ${
        isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-20'
      }`}
    >
      <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        {isSidebarOpen ? (
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">SaaS App</span>
        ) : (
          <span className="font-bold text-lg mx-auto bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">S</span>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2">
        {isSidebarOpen && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4 px-2">Main Menu</div>}
        
        <Link
          to="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
            isActive('/') ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        >
          <i className="pi pi-home" />
          {isSidebarOpen && <span className="font-medium">Dashboard</span>}
        </Link>
        <Link
          to="/users"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
            isActive('/users') ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        >
          <i className="pi pi-users" />
          {isSidebarOpen && <span className="font-medium">Users</span>}
        </Link>
        <Link
          to="/products"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
            isActive('/products') ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        >
          <i className="pi pi-box" />
          {isSidebarOpen && <span className="font-medium">Products</span>}
        </Link>
        <Link
          to="/orders"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
            isActive('/orders') ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        >
          <i className="pi pi-shopping-cart" />
          {isSidebarOpen && <span className="font-medium">Orders</span>}
        </Link>

        {isSidebarOpen && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-8 px-2">System</div>}
        <Link
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
            isActive('/settings') ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        >
          <i className="pi pi-cog" />
          {isSidebarOpen && <span className="font-medium">Settings</span>}
        </Link>
      </div>
    </aside>
  )
}
