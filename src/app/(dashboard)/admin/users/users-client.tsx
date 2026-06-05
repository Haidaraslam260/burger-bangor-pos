"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createUser, deleteUser, updateUser } from "@/actions/users";
import type { Role } from "@/db/schema";
import { DATE_FORMAT } from "@/constants";
import { Edit2, Loader2, Plus, Shield, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export interface UserListItem {
    id: string;
    email: string;
    fullName: string | null;
    role: Role;
    createdAt: Date | null;
    updatedAt: Date | null;
}

interface UsersClientProps {
    users: UserListItem[];
    currentUserId: string;
}

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
    { value: "kasir", label: "Kasir", description: "Akses POS" },
    { value: "manager", label: "Manager", description: "POS, inventory, reports" },
    { value: "admin", label: "Admin", description: "Akses penuh" },
];

function getRoleBadgeClass(role: Role) {
    const classes: Record<Role, string> = {
        admin: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
        manager: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
        kasir: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    };

    return classes[role];
}

function formatDate(value: Date | null) {
    if (!value) return "-";
    return DATE_FORMAT.format(new Date(value));
}

export default function UsersClient({ users, currentUserId }: UsersClientProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const userToDelete = users.find((user) => user.id === deleteUserId);

    function handleCreate(formData: FormData) {
        startTransition(async () => {
            const result = await createUser(null, formData);

            if (result.success) {
                toast.success(result.message);
                setIsOpen(false);
            } else {
                toast.error(result.error);
            }
        });
    }

    function handleUpdate(formData: FormData) {
        if (!editingUser) return;

        startTransition(async () => {
            const result = await updateUser(editingUser.id, null, formData);

            if (result.success) {
                toast.success(result.message);
                setEditingUser(null);
            } else {
                toast.error(result.error);
            }
        });
    }

    function handleDelete() {
        if (!deleteUserId) return;

        startTransition(async () => {
            const result = await deleteUser(deleteUserId);

            if (result.success) {
                toast.success(result.message);
                setDeleteUserId(null);
            } else {
                toast.error(result.error);
            }
        });
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                        <Plus className="h-4 w-4 mr-2" />
                        Tambah User
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah User Baru</DialogTitle>
                        <DialogDescription>
                            Buat akun untuk kasir, manager, atau admin.
                        </DialogDescription>
                    </DialogHeader>
                    <form action={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="create-fullName">Nama Lengkap</Label>
                            <Input id="create-fullName" name="fullName" placeholder="Nama user" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create-email">Email</Label>
                            <Input id="create-email" name="email" type="email" placeholder="user@example.com" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create-password">Password</Label>
                            <Input id="create-password" name="password" type="password" placeholder="Minimal 6 karakter" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create-role">Role</Label>
                            <Select name="role" defaultValue="kasir" required>
                                <SelectTrigger id="create-role">
                                    <SelectValue placeholder="Pilih role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLE_OPTIONS.map((role) => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label} - {role.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Kosongkan password jika tidak ingin mengubahnya.
                        </DialogDescription>
                    </DialogHeader>
                    {editingUser && (
                        <form action={handleUpdate} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-fullName">Nama Lengkap</Label>
                                <Input
                                    id="edit-fullName"
                                    name="fullName"
                                    defaultValue={editingUser.fullName ?? ""}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email</Label>
                                <Input id="edit-email" name="email" type="email" defaultValue={editingUser.email} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-password">Password Baru</Label>
                                <Input id="edit-password" name="password" type="password" placeholder="Opsional" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-role">Role</Label>
                                <Select name="role" defaultValue={editingUser.role} required>
                                    <SelectTrigger id="edit-role">
                                        <SelectValue placeholder="Pilih role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((role) => (
                                            <SelectItem key={role.value} value={role.value}>
                                                {role.label} - {role.description}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={isPending} className="bg-[#A3DF02] text-black hover:bg-[#92c902]">
                                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Update
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Hapus User?</DialogTitle>
                        <DialogDescription>
                            User {userToDelete?.email ?? "ini"} akan dihapus permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteUserId(null)}>
                            Batal
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {users.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Belum ada user.</p>
                    <p className="text-sm">Klik tombol &quot;Tambah User&quot; untuk memulai.</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Dibuat</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => {
                            const isCurrentUser = user.id === currentUserId;

                            return (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <p className="font-medium">{user.fullName}</p>
                                                {isCurrentUser && (
                                                    <p className="text-xs text-muted-foreground">Akun aktif</p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                                            <Shield className="h-3 w-3 mr-1" />
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(user.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => setEditingUser(user)}
                                                title="Edit user"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => setDeleteUserId(user.id)}
                                                disabled={isCurrentUser}
                                                title={isCurrentUser ? "Tidak bisa hapus akun sendiri" : "Hapus user"}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </>
    );
}
