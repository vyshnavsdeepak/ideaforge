import { cn } from '@/shared';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    error: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
    outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </span>
  );
}