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
        <Button type="submit" className="h-11 w-full bg-[#A3DF02] text-black hover:bg-[#92c902]" disabled={pending}>
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
        <div className="grid min-h-dvh w-full bg-background lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left Side - Image */}
            <div className="hidden lg:block relative h-full overflow-hidden bg-zinc-950">
                <Image
                    src="/images/burgerbngr.jpg"
                    alt="Premium Burger"
                    fill
                    className="object-cover object-center"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
                <div className="absolute bottom-8 left-8 right-8 z-20 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <UtensilsCrossed className="h-8 w-8 text-[#A3DF02]" />
                        <h1 className="text-3xl font-bold tracking-tight">Burger Bangor</h1>
                    </div>
                    <p className="max-w-lg text-base leading-relaxed text-zinc-200">
                        Sistem manajemen Point of Sales dan Inventori.
                        Kelola bisnis kuliner Anda dengan lebih efisien dan modern.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex items-center justify-center bg-muted/30 p-6 sm:p-8">
                <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm sm:p-8">
                    <div className="mb-6 text-center lg:text-left">
                        <div className="mb-4 flex items-center justify-center gap-2 lg:hidden">
                            <UtensilsCrossed className="h-7 w-7 text-[#A3DF02]" />
                            <span className="text-xl font-bold">Burger Bangor</span>
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight">Selamat Datang</h2>
                        <p className="text-muted-foreground mt-2">
                            Masukan kredensial Anda untuk mengakses sistem dashboard.
                        </p>
                    </div>

                    <form action={clientAction} className="space-y-5">
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

                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        &copy; 2026 Burger Bangor POS System
                    </p>
                </div>
            </div>
        </div>
    );
}
