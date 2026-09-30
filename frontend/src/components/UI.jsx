import { forwardRef, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

export const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  loading = false,
  ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 focus:ring-primary-500 dark:focus:ring-offset-slate-950',
    secondary: 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 focus:ring-slate-400 dark:focus:ring-offset-slate-950',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-400 dark:focus:ring-offset-slate-950',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500 dark:focus:ring-offset-slate-950',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-6 py-3 text-base gap-2',
    lg: 'px-8 py-4 text-lg gap-2.5',
  }

  return (
    <motion.button
      ref={ref}
      className={clsx(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </motion.button>
  )
})

Button.displayName = 'Button'

export const Card = forwardRef(({ children, className = '', hover = false, ...props }, ref) => (
  <motion.div
    ref={ref}
    className={clsx('glass-card', hover && 'hover:shadow-2xl hover:shadow-primary-500/10 dark:hover:shadow-accent-500/10 transition-shadow duration-300', className)}
    whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
    {...props}
  >
    {children}
  </motion.div>
))

Card.displayName = 'Card'

export const Panel = forwardRef(({ children, className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('glass-panel', className)}
    {...props}
  >
    {children}
  </div>
))

Panel.displayName = 'Panel'

export const Input = forwardRef(({ 
  label, 
  error, 
  className = '', 
  type = 'text', 
  ...props 
}, ref) => (
  <div className="w-full">
    {label && (
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
    )}
    <input
      ref={ref}
      type={type}
      className={clsx('input-field', error && 'border-red-500 focus:ring-red-500', className)}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id}-error` : undefined}
      {...props}
    />
    {error && (
      <p id={`${props.id}-error`} className="mt-1.5 text-sm text-red-500" role="alert">
        {error}
      </p>
    )}
  </div>
))

Input.displayName = 'Input'

export const Select = forwardRef(({ 
  label, 
  options, 
  error, 
  className = '', 
  ...props 
}, ref) => (
  <div className="w-full">
    {label && (
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
        {label}
      </label>
    )}
    <select
      ref={ref}
      className={clsx('input-field appearance-none bg-no-repeat bg-right pr-10', 'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%2364748b\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")]', error && 'border-red-500 focus:ring-red-500', className)}
      aria-invalid={!!error}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && (
      <p className="mt-1.5 text-sm text-red-500" role="alert">
        {error}
      </p>
    )}
  </div>
))

Select.displayName = 'Select'

export const Badge = ({ children, variant = 'default', className = '', ...props }) => {
  const variants = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    anomaly: 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse-glow',
    normal: 'bg-gradient-to-r from-green-500 to-green-600 text-white',
  }

  return (
    <span
      className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}

export const StatCard = ({ 
  label, 
  value, 
  delta, 
  icon, 
  trend = 'neutral',
  className = '',
  children 
}) => (
  <Card className={clsx('relative overflow-hidden', className)}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 text-3xl font-bold font-display text-slate-900 dark:text-slate-50">
          {value}
        </p>
        {delta && (
          <p className={clsx('mt-1 text-sm font-medium', 
            trend === 'up' ? 'text-green-600 dark:text-green-400' : 
            trend === 'down' ? 'text-red-600 dark:text-red-400' : 
            'text-slate-500 dark:text-slate-400'
          )}>
            {delta}
          </p>
        )}
      </div>
      {icon && (
        <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
          {icon}
        </div>
      )}
    </div>
    {children}
  </Card>
)

export const Skeleton = ({ className = '', variant = 'text', lines = 3, ...props }) => {
  const base = 'skeleton rounded'
  const variants = {
    text: 'h-4 w-full',
    title: 'h-8 w-3/4',
    card: 'h-48 w-full rounded-xl',
    avatar: 'h-12 w-12 rounded-full',
    button: 'h-10 w-24 rounded-xl',
    stat: 'h-12 w-24 rounded-xl',
  }

  if (variant === 'card') {
    return (
      <div className={clsx(base, variants.card, className)} {...props} />
    )
  }

  return (
    <div className={clsx(base, className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={clsx(variants[variant], i < lines - 1 && 'mt-3')} />
      ))}
    </div>
  )
}

export const Tooltip = ({ children, content, position = 'top', className = '' }) => {
  const [visible, setVisible] = useState(false)
  const tooltipRef = useRef(null)

  return (
    <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <motion.div
          ref={tooltipRef}
          className={clsx('absolute z-50 px-3 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 rounded-lg shadow-lg whitespace-nowrap', 
            position === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
            position === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
            position === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
            position === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
            className
          )}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          {content}
        </motion.div>
      )}
    </div>
  )
}

export const UI = { Button, Card, Panel, Input, Select, Badge, StatCard, Skeleton, Tooltip }
