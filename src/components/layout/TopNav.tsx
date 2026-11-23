import { useLocation } from 'react-router-dom'

interface TopNavProps {
  isSidebarOpen: boolean
  toggleSidebar: () => void
}

export default function TopNav({ isSidebarOpen, toggleSidebar }: TopNavProps) {
  const location = useLocation()
  
  const getBreadcrumb = () => {
    const path = location.pathname
    if (path === '/') return 'Dashboard'
    return path.substring(1).charAt(0).toUpperCase() + path.substring(2)
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-2 -ml-2 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <i className={isSidebarOpen ? 'pi pi-times text-lg' : 'pi pi-bars text-lg'} />
        </button>
        <div className="hidden sm:flex items-center text-sm font-medium text-slate-500">
          <i className="pi pi-compass mr-2 text-slate-400" />
          <span>Application</span>
          <i className="pi pi-chevron-right text-[10px] mx-2 text-slate-300" />
          <span className="text-slate-900 dark:text-slate-50">{getBreadcrumb()}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-900 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
          />
        </div>
        
        <button className="p-2 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
          <i className="pi pi-bell text-lg" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-950" />
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        <button className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 pr-2 rounded-full transition-colors">
          <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            US
          </span>
          <i className="pi pi-angle-down text-slate-400 text-sm" />
        </button>
      </div>
    </header>
  )
}
