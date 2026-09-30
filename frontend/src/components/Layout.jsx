'use client'

import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Menu, X, Github, ExternalLink, Command } from 'lucide-react'
import { clsx } from 'clsx'
import CommandPalette from './CommandPalette'
import { UI } from './UI'

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/train', label: 'Train Studio', icon: ZapIcon },
  { path: '/detect', label: 'Anomaly Detector', icon: EyeIcon },
  { path: '/threshold', label: 'Threshold Playground', icon: SlidersIcon },
  { path: '/latent', label: 'Latent Explorer', icon: CubeIcon },
  { path: '/denoise', label: 'Denoiser', icon: ZapOffIcon },
  { path: '/experiments', label: 'Experiments', icon: DatabaseIcon },
  { path: '/research', label: 'Research', icon: BookOpenIcon },
]

function HomeIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function ZapIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}
function EyeIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function SlidersIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
}
function CubeIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><path d="M16 21.3A8.17 8.17 0 0 1 4 12.52"/><path d="M4 11.54a16 16 0 0 1 12 0"/><path d="M4 6.27a8.17 8.17 0 0 1 12 8.76"/></svg>
}
function ZapOffIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
}
function DatabaseIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
}
function BookOpenIcon({ className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
}

export default function Layout() {
  const [isDark, setIsDark] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = saved ? JSON.parse(saved) : prefersDark
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('theme', JSON.stringify(newDark))
    document.documentElement.classList.toggle('dark', newDark)
  }

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setCommandOpen(true)
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div className="ambient-orbs" aria-hidden="true">
        <div className="ambient-orb ambient-orb-one" />
        <div className="ambient-orb ambient-orb-two" />
        <div className="ambient-orb ambient-orb-three" />
      </div>
      
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div className="cursor-glow" id="cursor-glow" />
      </div>

      <motion.div
        className="fixed inset-0 z-10 bg-black/50 backdrop-blur-sm"
        initial={false}
        animate={{ opacity: sidebarOpen ? 1 : 0 }}
        exit={{ opacity: 0 }}
        onClick={() => setSidebarOpen(false)}
        style={{ display: sidebarOpen ? 'block' : 'none' }}
      />

      <aside
        className={clsx(
          'fixed left-0 top-0 h-full z-20 glass border-r border-slate-200/50 dark:border-slate-700/50 transition-transform duration-300 ease-out',
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:translate-x-0 lg:w-64'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
            <motion.div
              className="flex items-center gap-3 px-2 py-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-display font-bold text-xl text-slate-900 dark:text-slate-50">Construct3</span>
            </motion.div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto" role="navigation" aria-label="Main navigation">
            <ul className="space-y-1" role="list">
              {NAV_ITEMS.map((item, index) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                    style={{ transitionDelay: `${index * 30}ms` }}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-3">
              <a 
                href="https://github.com/HVRGAMING2705/construct3-anomaly-detection" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <Github className="w-4 h-4" />
                GitHub
              </a>
              <a 
                href="#paper" 
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Paper
              </a>
            </div>
          </div>
        </div>
      </aside>

      <header className={clsx(
        'fixed top-0 right-0 z-20 glass border-b border-slate-200/50 dark:border-slate-700/50 transition-all duration-300',
        'lg:pl-64 w-full lg:w-[calc(100%-16rem)]'
      )}>
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
              <Command className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Search...</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              aria-label="Open command palette"
            >
              <Command className="w-4 h-4" />
              <span>Command Palette</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded">⌘K</kbd>
            </button>
          </div>
        </div>
      </header>

      <main className={clsx(
        'pt-16 min-h-screen transition-all duration-300',
        'lg:pl-64 w-full lg:w-[calc(100%-16rem)]'
      )}>
        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </main>

      <CommandPalette 
        isOpen={commandOpen} 
        onClose={() => setCommandOpen(false)} 
        navigate={navigate} 
      />

      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            const glow = document.getElementById('cursor-glow');
            let mouseX = 0, mouseY = 0;
            let glowX = 0, glowY = 0;
            
            document.addEventListener('mousemove', (e) => {
              mouseX = e.clientX;
              mouseY = e.clientY;
            });
            
            function animate() {
              glowX += (mouseX - glowX) * 0.15;
              glowY += (mouseY - glowY) * 0.15;
              if (glow) {
                glow.style.transform = 'translate(' + (glowX - 200) + 'px, ' + (glowY - 200) + 'px)';
              }
              requestAnimationFrame(animate);
            }
            animate();
          })();
        `
      }} />
    </>
  )
}
