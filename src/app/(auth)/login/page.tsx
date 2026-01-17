"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { login } from "@/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, UtensilsCrossed } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Masuk...
                </>
            ) : (
                "Masuk Aplikasi"
            )}
        </Button>
    );
}

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    async function clientAction(formData: FormData) {
        setError(null);
        const result = await login(null, formData);

        if (result.error) {
            setError(result.error);
            toast.error(result.error);
        } else if (result.success) {
            toast.success("Login berhasil!");
            router.push("/dashboard");
            router.refresh();
        }
    }

    return (
        <div className="w-full h-screen grid lg:grid-cols-2">
            {/* Left Side - Image */}
            <div className="hidden lg:block relative h-full bg-zinc-900">
                <div className="absolute inset-0 bg-black/20 z-10" />
                <Image
                    src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1998&auto=format&fit=crop"
                    alt="Premium Burger"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute bottom-10 left-10 z-20 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <UtensilsCrossed className="h-8 w-8 text-orange-500" />
                        <h1 className="text-3xl font-bold tracking-tight">Burger Bangor</h1>
                    </div>
                    <p className="text-zinc-300 text-lg max-w-md">
                        Sistem manajemen Point of Sales dan Inventori.
                        Kelola bisnis kuliner Anda dengan lebih efisien dan modern.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">Selamat Datang</h2>
                        <p className="text-muted-foreground mt-2">
                            Masukan kredensial Anda untuk mengakses sistem dashboard.
                        </p>
                    </div>

                    <form action={clientAction} className="space-y-6">
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="nama@burgerbangor.id"
                                required
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="h-11"
                            />
                        </div>

                        <SubmitButton />

                    </form>

                    <p className="text-center text-sm text-muted-foreground">
                        &copy; 2026 Burger Bangor POS System
                    </p>
                </div>
            </div>
        </div>
    );
}
