import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pengguna</h1>
                    <p className="text-muted-foreground">Kelola akun kasir, manager, dan admin</p>
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah User
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Pengguna</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <p>Tabel pengguna akan ditampilkan di sini.</p>
                        <p className="text-sm">Fitur CRUD user dengan role dalam pengembangan.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
