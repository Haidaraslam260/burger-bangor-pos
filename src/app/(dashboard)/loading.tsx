export default function Loading() {
    return (
        <div className="space-y-8 animate-pulse w-full">
            {/* Header Section Skeleton */}
            <div className="flex items-center justify-between border-b pb-6">
                <div className="space-y-2">
                    <div className="h-8 w-48 rounded bg-muted"></div>
                    <div className="h-4 w-72 rounded bg-muted/60"></div>
                </div>
                <div className="h-9 w-32 rounded-full bg-muted/80"></div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card p-6 shadow-sm border-muted/40">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 rounded bg-muted"></div>
                            <div className="h-4 w-4 rounded-full bg-muted"></div>
                        </div>
                        <div className="mt-2 space-y-2">
                            <div className="h-8 w-36 rounded bg-muted"></div>
                            <div className="h-3 w-20 rounded bg-muted/60"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions / Content List Skeleton */}
            <div className="space-y-4">
                <div className="h-5 w-32 rounded bg-muted"></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-xl border border-dashed border-muted/50 p-6 space-y-3">
                            <div className="h-12 w-12 rounded-lg bg-muted"></div>
                            <div className="h-4 w-28 rounded bg-muted"></div>
                            <div className="h-3 w-40 rounded bg-muted/60"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
