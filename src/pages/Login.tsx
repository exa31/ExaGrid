import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { useState } from 'react'
import { Link,useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock login
    navigate('/')
  }

  return (
    <div className="p-8">
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
          <InputText 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            type="email" 
            className="w-full" 
            placeholder="you@example.com" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
          <InputText 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            type="password" 
            className="w-full" 
            placeholder="••••••••" 
          />
        </div>
        
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded text-indigo-500 focus:ring-indigo-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
          </label>
          <a href="#" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Forgot password?</a>
        </div>

        <Button type="submit" label="Sign in" className="w-full bg-indigo-600 hover:bg-indigo-700 border-none mt-2" />
        
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/auth/register" className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  )
}
