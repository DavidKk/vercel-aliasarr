import { AdminCard } from '@/components/admin-layout'
import { Skeleton } from '@/components/ui'

export function AdminPageSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <div className="mb-4 border-b border-app-border/70 pb-4">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-9 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[74px]" rounded="lg" />
        ))}
      </div>
      <div className="grid max-w-3xl gap-4">
        {Array.from({ length: cards }, (_, index) => (
          <AdminCard key={index}>
            <div className="flex items-start justify-between gap-4 border-b border-app-border/70 pb-4">
              <div className="flex-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-3 h-3 w-3/5" />
              </div>
              <Skeleton className="h-6 w-20" rounded="full" />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Skeleton className="h-[76px]" rounded="lg" />
              <Skeleton className="h-[76px]" rounded="lg" />
            </div>
            <Skeleton className="mt-5 h-12 w-full" rounded="lg" />
          </AdminCard>
        ))}
      </div>
    </div>
  )
}

export function ConfigContentSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading configuration">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-52" />
      <Skeleton className="mt-3 h-3 w-full max-w-xl" />
      <div className="mt-4 grid max-w-3xl gap-4">
        {[0, 1, 2].map((item) => (
          <AdminCard key={item}>
            <div className="flex items-start justify-between gap-4 border-b border-app-border/70 pb-4">
              <div className="flex-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-3 h-3 w-2/3" />
              </div>
              <Skeleton className="h-6 w-20" rounded="full" />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Skeleton className="h-[76px]" />
              <Skeleton className="h-[76px]" />
            </div>
          </AdminCard>
        ))}
      </div>
    </section>
  )
}
