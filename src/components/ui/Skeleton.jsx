/**
 * Loading skeleton primitives. All blocks pulse via Tailwind's
 * `animate-pulse` and use surface-sunken as the placeholder colour
 * so they sit naturally on white cards or page background.
 */

export function Skeleton({ className = "", rounded = false }) {
  const radius = rounded ? "rounded-full" : "rounded-[var(--radius-md)]";
  return (
    <div className={`bg-[var(--surface-sunken)] animate-pulse ${radius} ${className}`} />
  );
}

/** A single table-row shaped placeholder: 4 bars of varying widths. */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] last:border-0">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 flex-1 max-w-[200px]" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-16 ml-auto" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

/** A card-shaped placeholder with a few stacked bars. */
export function SkeletonCard({ className = "" }) {
  return (
    <div className={`bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-5 ${className}`}>
      <Skeleton className="h-3 w-24 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/** Matches the dimensions of a KPI card. */
export function SkeletonKPI() {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4">
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-7 w-32 mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/** Full-page dashboard placeholder. */
export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Skeleton className="h-7 w-56 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
        <SkeletonKPI />
      </div>

      {/* 2/3 + 1/3 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard className="h-[260px]" />
          <SkeletonCard className="h-[200px]" />
        </div>
        <div className="space-y-4">
          <SkeletonCard className="h-[260px]" />
          <SkeletonCard className="h-[140px]" />
        </div>
      </div>
    </div>
  );
}

/** Full-page list placeholder (header + summary cards + table). */
export function ListSkeleton({ rows = 8 }) {
  return (
    <div className="bg-[var(--surface-page)] min-h-screen">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
          <div>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4">
              <Skeleton className="h-3 w-16 mb-2.5" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>

        {/* Main card: toolbar + table */}
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          {/* Toolbar */}
          <div className="p-3 flex items-center gap-2 border-b border-[var(--border-subtle)]">
            <Skeleton className="h-9 flex-1 max-w-[260px]" />
            <Skeleton className="h-7 w-16 rounded-[var(--radius-md)]" />
            <Skeleton className="h-7 w-16 rounded-[var(--radius-md)]" />
            <Skeleton className="h-7 w-16 rounded-[var(--radius-md)]" />
          </div>

          {/* Table header */}
          <div className="bg-[var(--surface-sunken)] px-4 py-2.5 flex items-center gap-3 border-b border-[var(--border-subtle)]">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 flex-1 max-w-[120px]" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16 ml-auto" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Rows */}
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
