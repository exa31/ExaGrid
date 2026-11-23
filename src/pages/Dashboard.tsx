import { Card } from 'primereact/card'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Welcome back to your workspace.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Total Revenue" className="shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="text-3xl font-bold">$45,231.89</div>
          <div className="text-sm text-green-500 mt-2 flex items-center gap-1">
            <i className="pi pi-arrow-up text-xs" /> +20.1% from last month
          </div>
        </Card>
        <Card title="Active Users" className="shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="text-3xl font-bold">+2350</div>
          <div className="text-sm text-slate-500 mt-2 flex items-center gap-1">
            <i className="pi pi-minus text-xs" /> +180 since last hour
          </div>
        </Card>
        <Card title="Active Subscriptions" className="shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="text-3xl font-bold">+12,234</div>
          <div className="text-sm text-green-500 mt-2 flex items-center gap-1">
            <i className="pi pi-arrow-up text-xs" /> +19% from last month
          </div>
        </Card>
      </div>
    </div>
  )
}
