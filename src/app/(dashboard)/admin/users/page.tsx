import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Users } from "lucide-react";
import UsersClient from "./users-client";

export default async function UsersPage() {
    const session = await auth();
    const userList = await db
        .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
            role: users.role,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
        })
        .from(users)
        .orderBy(users.createdAt);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pengguna</h1>
                    <p className="text-muted-foreground">Kelola akun kasir, manager, dan admin</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Daftar Pengguna
                        </CardTitle>
                        <Badge variant="secondary">{userList.length} user</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <UsersClient
                        users={userList}
                        currentUserId={session?.user.id ?? ""}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
