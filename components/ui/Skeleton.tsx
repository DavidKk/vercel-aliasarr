import type { HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'full'
}

const radius = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
}

export function Skeleton({ className = '', rounded = 'md', ...props }: SkeletonProps) {
  return <div aria-hidden="true" className={`ui-skeleton ${radius[rounded]} ${className}`} {...props} />
}
