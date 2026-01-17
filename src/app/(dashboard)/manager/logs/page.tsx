import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2 } from "lucide-react";
import { db } from "@/lib/db";
import { activityLogs, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

function getActionColor(action: string) {
    const colors: Record<string, string> = {
        CHECKOUT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
        RESTOCK: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        UPDATE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
        CREATE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
        DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
        ADJUST: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
    };
    return colors[action] || "bg-gray-100 text-gray-700 border-gray-200";
}

export default async function LogsPage() {
    const logs = await db
        .select({
            id: activityLogs.id,
            action: activityLogs.action,
            details: activityLogs.details,
            createdAt: activityLogs.createdAt,
            userName: users.fullName,
            userRole: users.role,
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .orderBy(desc(activityLogs.createdAt))
        .limit(50);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                <p className="text-muted-foreground">Riwayat aktivitas sistem dan perubahan data</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Log Aktivitas Terbaru</CardTitle>
                        <Badge variant="outline" className="font-normal text-muted-foreground">
                            {logs.length} entri terakhir
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative border-l border-muted ml-4 space-y-8 py-2">
                        {logs.map((log) => (
                            <div key={log.id} className="relative pl-8 group">
                                <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background ${getActionColor(log.action).split(' ')[0]} ring-4 ring-background`} />

                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={`${getActionColor(log.action).split(' ').slice(0, 2).join(' ')} border-0 font-medium`}>
                                                {log.action}
                                            </Badge>
                                            <span className="text-sm font-medium text-foreground">
                                                {log.userName || "Unknown User"}
                                                <span className="text-muted-foreground font-normal ml-1">
                                                    ({log.userRole})
                                                </span>
                                            </span>
                                        </div>

                                        <p className="text-sm text-foreground/80 leading-relaxed max-w-2xl">
                                            {JSON.parse(JSON.stringify(log.details))}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-1 rounded">
                                        <Clock className="h-3 w-3" />
                                        {log.createdAt && formatDistanceToNow(new Date(log.createdAt), {
                                            addSuffix: true,
                                            locale: id
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {logs.length === 0 && (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center p-4 bg-muted rounded-full mb-4">
                                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium">Belum ada aktivitas</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Aktivitas transaksi dan perubahan data akan muncul di sini.
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
