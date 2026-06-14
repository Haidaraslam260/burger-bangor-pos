"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
    cancelCustomerOrder,
    createCustomerOrder,
    getCustomerSessionOrders,
    type CustomerOrderDetail,
} from "@/actions/customer-orders";
import { CURRENCY_FORMAT, PRODUCT_CATEGORIES } from "@/constants";
import type { Product } from "@/db/schema";
import {
    CheckCircle2,
    Clock,
    CreditCard,
    Loader2,
    Minus,
    Moon,
    Plus,
    ReceiptText,
    RefreshCw,
    Search,
    ShoppingBag,
    Sun,
    Trash2,
    UtensilsCrossed,
} from "lucide-react";

interface CustomerMenuClientProps {
    products: Product[];
    availabilityByProductId: Record<number, number | null>;
    initialTableNumber: string;
}

interface MenuCartItem {
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
}

const TAX_RATE = 10;
const CUSTOMER_THEME_KEY = "customer-menu-theme";
const CUSTOMER_SESSION_KEY_PREFIX = "customer-menu-session";

function calculateCart(items: MenuCartItem[]) {
    const subtotalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = Math.round(subtotalAmount * TAX_RATE / 100);
    const totalBeforeRounding = subtotalAmount + taxAmount;
    const roundingAmount = Math.round(totalBeforeRounding / 100) * 100 - totalBeforeRounding;

    return {
        subtotalAmount,
        taxAmount,
        roundingAmount,
        totalAmount: totalBeforeRounding + roundingAmount,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
}

export default function CustomerMenuClient({
    products,
    availabilityByProductId,
    initialTableNumber,
}: CustomerMenuClientProps) {
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [cartItems, setCartItems] = useState<MenuCartItem[]>([]);
    const tableNumber = initialTableNumber;
    const [customerName, setCustomerName] = useState("");
    const [notes, setNotes] = useState("");
    const [customerTheme, setCustomerTheme] = useState<"light" | "dark">(() => {
        if (typeof window === "undefined") return "light";
        return localStorage.getItem(CUSTOMER_THEME_KEY) === "dark" ? "dark" : "light";
    });
    const [result, setResult] = useState<{ success: boolean; message: string; orderId?: number } | null>(null);
    const [sessionToken, setSessionToken] = useState("");
    const [sessionOrders, setSessionOrders] = useState<CustomerOrderDetail[]>([]);
    const [latestOrder, setLatestOrder] = useState<CustomerOrderDetail | null>(null);
    const [orderError, setOrderError] = useState<string | null>(null);
    const [isRefreshingOrder, setIsRefreshingOrder] = useState(false);
    const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const submitLockRef = useRef(false);
    const [isPending, startTransition] = useTransition();

    const cart = calculateCart(cartItems);
    const categories = ["all", ...PRODUCT_CATEGORIES.filter((category) =>
        products.some((product) => product.category === category)
    )];

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [products, searchQuery, selectedCategory]);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", customerTheme === "dark");
        document.documentElement.style.colorScheme = customerTheme;
    }, [customerTheme]);

    const storedSessionKey = `${CUSTOMER_SESSION_KEY_PREFIX}:${tableNumber || "unknown"}`;

    async function refreshSessionOrders(token = sessionToken) {
        if (!token || !tableNumber.trim()) return;

        setIsRefreshingOrder(true);
        const response = await getCustomerSessionOrders(token, tableNumber);
        setIsRefreshingOrder(false);

        if (response.success && response.orders) {
            setSessionOrders(response.orders);
            setLatestOrder(response.orders.at(-1) ?? null);
            setOrderError(null);
            return;
        }

        setOrderError(response.error ?? "Detail pesanan tidak bisa dimuat");
    }

    useEffect(() => {
        if (typeof window === "undefined" || !tableNumber.trim()) return;
        const storedToken = localStorage.getItem(storedSessionKey);
        const token = storedToken || crypto.randomUUID();
        localStorage.setItem(storedSessionKey, token);
        setSessionToken(token);
        void refreshSessionOrders(token);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storedSessionKey, tableNumber]);

    useEffect(() => {
        if (!sessionOrders.some((order) => order.paymentStatus === "pending")) return;
        const interval = window.setInterval(() => {
            void refreshSessionOrders();
        }, 8000);
        return () => window.clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionOrders, sessionToken]);

    function toggleCustomerTheme() {
        const nextTheme = customerTheme === "dark" ? "light" : "dark";
        setCustomerTheme(nextTheme);
        localStorage.setItem(CUSTOMER_THEME_KEY, nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        document.documentElement.style.colorScheme = nextTheme;
    }

    function getAvailability(productId: number) {
        return availabilityByProductId[productId];
    }

    function addToCart(product: Product) {
        const availability = getAvailability(product.id);
        const currentQuantity = cartItems.find((item) => item.productId === product.id)?.quantity ?? 0;

        if (availability !== null && availability !== undefined && currentQuantity >= availability) return;

        setResult(null);
        setCartItems((current) => {
            const existing = current.find((item) => item.productId === product.id);
            const unitPrice = Number(product.price);

            if (existing) {
                return current.map((item) =>
                    item.productId === product.id
                        ? {
                            ...item,
                            quantity: item.quantity + 1,
                            subtotal: (item.quantity + 1) * item.unitPrice,
                        }
                        : item
                );
            }

            return [
                ...current,
                {
                    productId: product.id,
                    productName: product.name,
                    unitPrice,
                    quantity: 1,
                    subtotal: unitPrice,
                },
            ];
        });
    }

    function updateQuantity(productId: number, delta: number) {
        const availability = getAvailability(productId);

        setResult(null);
        setCartItems((current) =>
            current
                .map((item) => {
                    if (item.productId !== productId) return item;
                    const nextQuantity = item.quantity + delta;
                    const cappedQuantity = availability !== null && availability !== undefined
                        ? Math.min(nextQuantity, availability)
                        : nextQuantity;

                    return {
                        ...item,
                        quantity: cappedQuantity,
                        subtotal: cappedQuantity * item.unitPrice,
                    };
                })
                .filter((item) => item.quantity > 0)
        );
    }

    function removeItem(productId: number) {
        setCartItems((current) => current.filter((item) => item.productId !== productId));
    }

    function submitOrder() {
        if (cartItems.length === 0) {
            setResult({ success: false, message: "Pilih menu terlebih dahulu" });
            return;
        }

        if (!tableNumber.trim()) {
            setResult({ success: false, message: "Nomor meja wajib diisi" });
            return;
        }
        setIsConfirmDialogOpen(true);
    }

    function confirmSubmitOrder() {
        if (submitLockRef.current || isPending || cartItems.length === 0 || !sessionToken) return;
        submitLockRef.current = true;
        const idempotencyKey = crypto.randomUUID();

        const formData = new FormData();
        formData.append("data", JSON.stringify({
            tableNumber,
            sessionToken,
            idempotencyKey,
            customerName: customerName || undefined,
            notes: notes || undefined,
            items: cartItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
            })),
        }));

        startTransition(async () => {
            const response = await createCustomerOrder(formData);
            submitLockRef.current = false;
            setResult({
                success: response.success,
                message: response.error || response.message,
                orderId: response.orderId,
            });

            if (response.success) {
                await refreshSessionOrders(response.sessionToken ?? sessionToken);
                setIsConfirmDialogOpen(false);
                setIsOrderDialogOpen(true);
                setCartItems([]);
                setNotes("");
            }
        });
    }

    function startNewOrderSession() {
        if (typeof window === "undefined") return;
        const token = crypto.randomUUID();
        localStorage.setItem(storedSessionKey, token);
        setSessionToken(token);
        setSessionOrders([]);
        setLatestOrder(null);
        setResult(null);
        setOrderError(null);
        setIsOrderDialogOpen(false);
    }

    function cancelPendingOrder(order: CustomerOrderDetail) {
        if (!sessionToken || isPending) return;
        const formData = new FormData();
        formData.set("orderToken", order.orderToken);
        formData.set("sessionToken", sessionToken);
        formData.set("reason", "Dibatalkan pelanggan sebelum diproses");

        startTransition(async () => {
            const response = await cancelCustomerOrder(formData);
            setResult({ success: response.success, message: response.error || response.message });
            await refreshSessionOrders();
        });
    }

    const paymentStatusLabel = latestOrder?.paymentStatus === "paid"
        ? "Sudah dibayar"
        : latestOrder?.paymentStatus === "refunded"
            ? "Refund"
            : latestOrder?.paymentStatus === "voided"
                ? "Dibatalkan"
                : "Menunggu pembayaran";

    const transactionStatusLabel = latestOrder?.status === "completed"
        ? "Selesai"
        : latestOrder?.status === "refunded"
            ? "Refund"
            : latestOrder?.status === "voided"
                ? "Dibatalkan"
                : "Menunggu kasir";

    return (
        <main className="min-h-screen bg-background pb-[260px] md:pb-40">
            <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-28 shrink-0 items-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/typograph_black.svg"
                                alt="Burger Bangor"
                                className="h-full w-full object-contain dark:hidden"
                            />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/typograph_white.svg"
                                alt="Burger Bangor"
                                className="hidden h-full w-full object-contain dark:block"
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase text-[#6f9900]">Menu Meja</p>
                            <h1 className="truncate text-sm font-semibold sm:text-base">Pesan dari meja</h1>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary" className="whitespace-nowrap">
                            Meja {tableNumber || "-"}
                        </Badge>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            aria-label={customerTheme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
                            onClick={toggleCustomerTheme}
                        >
                            {customerTheme === "dark" ? (
                                <Sun className="h-4 w-4 text-[#D4FF74]" />
                            ) : (
                                <Moon className="h-4 w-4 text-[#6f9900]" />
                            )}
                        </Button>
                    </div>
                </div>
            </header>

            <section className="mx-auto max-w-5xl space-y-3 px-3 py-3 sm:space-y-4 sm:px-4 sm:py-4">
                {latestOrder && (
                    <div className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <ReceiptText className="h-4 w-4 text-[#6f9900]" />
                                    <h2 className="text-sm font-semibold sm:text-base">Pesanan #{latestOrder.id}</h2>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {new Date(latestOrder.transactionDate).toLocaleString("id-ID", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                    {latestOrder.customerName ? ` - ${latestOrder.customerName}` : ""}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0"
                                onClick={() => refreshSessionOrders()}
                                disabled={isRefreshingOrder}
                                aria-label="Refresh status pesanan"
                            >
                                <RefreshCw className={isRefreshingOrder ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                            </Button>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    Status
                                </span>
                                <Badge variant={latestOrder.status === "completed" ? "default" : "secondary"}>
                                    {transactionStatusLabel}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                                <span className="flex items-center gap-2 text-muted-foreground">
                                    <CreditCard className="h-4 w-4" />
                                    Pembayaran
                                </span>
                                <Badge variant={latestOrder.paymentStatus === "paid" ? "default" : "outline"}>
                                    {paymentStatusLabel}
                                </Badge>
                            </div>
                        </div>

                        <div className="mt-3 space-y-2">
                            {latestOrder.items.map((item) => (
                                <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.quantity} x {CURRENCY_FORMAT.format(item.unitPrice)}
                                        </p>
                                    </div>
                                    <p className="shrink-0 font-semibold">{CURRENCY_FORMAT.format(item.subtotal)}</p>
                                </div>
                            ))}
                        </div>

                        <Separator className="my-3" />
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{CURRENCY_FORMAT.format(latestOrder.subtotalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Pajak {TAX_RATE}%</span>
                                <span>{CURRENCY_FORMAT.format(latestOrder.taxAmount)}</span>
                            </div>
                            {latestOrder.roundingAmount !== 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Pembulatan</span>
                                    <span>{CURRENCY_FORMAT.format(latestOrder.roundingAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-1 text-base font-bold">
                                <span>Total</span>
                                <span className="text-[#6f9900]">{CURRENCY_FORMAT.format(latestOrder.totalAmount)}</span>
                            </div>
                            {latestOrder.paymentStatus === "paid" && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Dibayar</span>
                                    <span>{CURRENCY_FORMAT.format(latestOrder.amountPaid)}</span>
                                </div>
                            )}
                            {latestOrder.changeAmount > 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Kembalian</span>
                                    <span>{CURRENCY_FORMAT.format(latestOrder.changeAmount)}</span>
                                </div>
                            )}
                        </div>
                        {orderError && <p className="mt-2 text-sm font-medium text-red-600">{orderError}</p>}
                    </div>
                )}

                <div className="grid gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Cari menu"
                            className="h-11 pl-9"
                        />
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    {categories.map((category) => (
                        <Button
                            key={category}
                            type="button"
                            variant={selectedCategory === category ? "default" : "outline"}
                            size="sm"
                            className={selectedCategory === category ? "h-9 shrink-0 bg-[#A3DF02] text-black hover:bg-[#92c902]" : "h-9 shrink-0"}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category === "all" ? "Semua" : category}
                        </Button>
                    ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => {
                        const availability = getAvailability(product.id);
                        const isUnavailable = availability !== null && availability !== undefined && availability <= 0;
                        const selectedQuantity = cartItems.find((item) => item.productId === product.id)?.quantity ?? 0;

                        return (
                            <article key={product.id} className="flex overflow-hidden rounded-lg border bg-card sm:block">
                                <div className="relative h-28 w-28 shrink-0 bg-muted sm:aspect-[4/3] sm:h-auto sm:w-full">
                                    {product.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={product.imageUrl}
                                            alt={product.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-[#F8FFE8] text-[#A3DF02]">
                                            <UtensilsCrossed className="h-10 w-10" />
                                        </div>
                                    )}
                                    {isUnavailable && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                                            <Badge variant="destructive">Habis</Badge>
                                        </div>
                                    )}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 p-3">
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <h2 className="line-clamp-2 text-sm font-semibold sm:text-base">{product.name}</h2>
                                            <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">{product.category}</Badge>
                                        </div>
                                        {product.description && (
                                            <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{product.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-[#6f9900] sm:text-base">{CURRENCY_FORMAT.format(Number(product.price))}</p>
                                        {selectedQuantity > 0 ? (
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0"
                                                    onClick={() => updateQuantity(product.id, -1)}
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="w-6 text-center font-semibold">{selectedQuantity}</span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-8 w-8 shrink-0"
                                                    disabled={isUnavailable || (availability !== null && availability !== undefined && selectedQuantity >= availability)}
                                                    onClick={() => updateQuantity(product.id, 1)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-9 shrink-0 bg-[#A3DF02] text-black hover:bg-[#92c902]"
                                                disabled={isUnavailable}
                                                onClick={() => addToCart(product)}
                                            >
                                                <Plus className="mr-1 h-4 w-4" />
                                                Pilih
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                <DialogContent className="max-h-[88dvh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
                    <DialogHeader className="pr-8 text-left">
                        <DialogTitle>Konfirmasi Pesanan</DialogTitle>
                        <DialogDescription>
                            Periksa menu, jumlah, dan catatan sebelum pesanan dikirim ke kasir.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-3 rounded-md border p-3">
                            {cartItems.map((item) => (
                                <div key={item.productId} className="flex items-start justify-between gap-3 text-sm">
                                    <div>
                                        <p className="font-medium">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.quantity} x {CURRENCY_FORMAT.format(item.unitPrice)}
                                        </p>
                                    </div>
                                    <p className="shrink-0 font-semibold">{CURRENCY_FORMAT.format(item.subtotal)}</p>
                                </div>
                            ))}
                        </div>
                        {(customerName || notes) && (
                            <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                                {customerName && <p><span className="text-muted-foreground">Nama:</span> {customerName}</p>}
                                {notes && <p><span className="text-muted-foreground">Catatan:</span> {notes}</p>}
                            </div>
                        )}
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{CURRENCY_FORMAT.format(cart.subtotalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Pajak {TAX_RATE}%</span>
                                <span>{CURRENCY_FORMAT.format(cart.taxAmount)}</span>
                            </div>
                            {cart.roundingAmount !== 0 && (
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Pembulatan</span>
                                    <span>{CURRENCY_FORMAT.format(cart.roundingAmount)}</span>
                                </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span className="text-[#6f9900]">{CURRENCY_FORMAT.format(cart.totalAmount)}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
                                Periksa Lagi
                            </Button>
                            <Button
                                type="button"
                                className="bg-[#A3DF02] text-black hover:bg-[#92c902]"
                                disabled={isPending || submitLockRef.current}
                                onClick={confirmSubmitOrder}
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Konfirmasi
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                <DialogContent className="max-h-[88dvh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
                    <DialogHeader className="pr-8 text-left">
                        <DialogTitle className="flex items-center gap-2">
                            <ReceiptText className="h-5 w-5 text-[#6f9900]" />
                            {latestOrder ? `Rincian Pesanan #${latestOrder.id}` : "Rincian Pesanan"}
                        </DialogTitle>
                        <DialogDescription>
                            Periksa kembali pesanan dan status pembayarannya.
                        </DialogDescription>
                    </DialogHeader>

                    {latestOrder ? (
                        <div className="space-y-4">
                            {sessionOrders.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {sessionOrders.map((order) => (
                                        <Button
                                            key={order.id}
                                            type="button"
                                            size="sm"
                                            variant={latestOrder.id === order.id ? "default" : "outline"}
                                            className={latestOrder.id === order.id ? "shrink-0 bg-[#A3DF02] text-black hover:bg-[#92c902]" : "shrink-0"}
                                            onClick={() => setLatestOrder(order)}
                                        >
                                            #{order.id}
                                        </Button>
                                    ))}
                                </div>
                            )}
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="h-4 w-4" />
                                        Status pesanan
                                    </span>
                                    <Badge variant={latestOrder.status === "completed" ? "default" : "secondary"}>
                                        {transactionStatusLabel}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        <CreditCard className="h-4 w-4" />
                                        Pembayaran
                                    </span>
                                    <Badge variant={latestOrder.paymentStatus === "paid" ? "default" : "outline"}>
                                        {paymentStatusLabel}
                                    </Badge>
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Meja {tableNumber}</span>
                                    <span>
                                        {new Date(latestOrder.transactionDate).toLocaleString("id-ID", {
                                            day: "2-digit",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </div>
                                <div className="space-y-3 rounded-md border p-3">
                                    {latestOrder.items.map((item) => (
                                        <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                                            <div className="min-w-0">
                                                <p className="font-medium">{item.productName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.quantity} x {CURRENCY_FORMAT.format(item.unitPrice)}
                                                </p>
                                            </div>
                                            <p className="shrink-0 font-semibold">
                                                {CURRENCY_FORMAT.format(item.subtotal)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>{CURRENCY_FORMAT.format(latestOrder.subtotalAmount)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Pajak {TAX_RATE}%</span>
                                    <span>{CURRENCY_FORMAT.format(latestOrder.taxAmount)}</span>
                                </div>
                                {latestOrder.roundingAmount !== 0 && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Pembulatan</span>
                                        <span>{CURRENCY_FORMAT.format(latestOrder.roundingAmount)}</span>
                                    </div>
                                )}
                                <Separator className="my-2" />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-[#6f9900]">
                                        {CURRENCY_FORMAT.format(latestOrder.totalAmount)}
                                    </span>
                                </div>
                                {latestOrder.paymentStatus === "paid" && (
                                    <>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Dibayar</span>
                                            <span>{CURRENCY_FORMAT.format(latestOrder.amountPaid)}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Kembalian</span>
                                            <span>{CURRENCY_FORMAT.format(latestOrder.changeAmount)}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {latestOrder.paymentStatus === "pending" && (
                                <>
                                    <p className="rounded-md bg-[#F3FFD5] px-3 py-2 text-sm text-[#527200] dark:bg-[#263500] dark:text-[#D4FF74]">
                                        Stok dicadangkan selama 15 menit. Tunjukkan nomor pesanan ini kepada kasir.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="w-full"
                                        disabled={isPending}
                                        onClick={() => cancelPendingOrder(latestOrder)}
                                    >
                                        Batalkan Pesanan
                                    </Button>
                                </>
                            )}
                            {orderError && <p className="text-sm font-medium text-red-600">{orderError}</p>}

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => refreshSessionOrders()}
                                disabled={isRefreshingOrder}
                            >
                                <RefreshCw className={isRefreshingOrder ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                                Perbarui status
                            </Button>
                            {sessionOrders.length > 0 && sessionOrders.every((order) => order.paymentStatus !== "pending") && (
                                <Button
                                    type="button"
                                    className="w-full bg-[#A3DF02] text-black hover:bg-[#92c902]"
                                    onClick={startNewOrderSession}
                                >
                                    Pesanan Baru
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-10 text-muted-foreground">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Memuat rincian pesanan
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <section className="fixed inset-x-0 bottom-0 z-30 border-t bg-background shadow-lg">
                <div className="mx-auto grid max-h-[62dvh] max-w-5xl gap-3 overflow-y-auto px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:grid-cols-[1fr_320px] md:px-4">
                    <div className="min-h-0">
                        {cartItems.length === 0 ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ShoppingBag className="h-4 w-4" />
                                Keranjang masih kosong
                            </div>
                        ) : (
                            <div className="max-h-28 space-y-2 overflow-y-auto pr-1">
                                {cartItems.map((item) => (
                                    <div key={item.productId} className="flex items-center justify-between gap-3 text-sm">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{item.productName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.quantity} x {CURRENCY_FORMAT.format(item.unitPrice)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{CURRENCY_FORMAT.format(item.subtotal)}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-600"
                                                onClick={() => removeItem(item.productId)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <details className="rounded-md border px-3 py-2">
                            <summary className="cursor-pointer text-sm font-medium">Nama / catatan opsional</summary>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <Input
                                    value={customerName}
                                    onChange={(event) => setCustomerName(event.target.value)}
                                    placeholder="Nama"
                                    className="h-10"
                                />
                                <Input
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    placeholder="Catatan"
                                    className="h-10"
                                />
                            </div>
                        </details>
                        <Separator />
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {cart.itemCount} item, termasuk pajak {TAX_RATE}%
                                </p>
                                <p className="text-lg font-bold leading-tight">{CURRENCY_FORMAT.format(cart.totalAmount)}</p>
                            </div>
                            <Button
                                type="button"
                                className="h-11 shrink-0 bg-[#A3DF02] px-3 text-black hover:bg-[#92c902] sm:px-4"
                                disabled={isPending || cartItems.length === 0}
                                onClick={submitOrder}
                            >
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Kirim
                            </Button>
                        </div>
                        {result && (
                            <div className="flex items-center justify-between gap-3">
                                <p className={result.success ? "text-sm font-medium text-green-600" : "text-sm font-medium text-red-600"}>
                                    {result.message}
                                </p>
                                {result.success && latestOrder && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => setIsOrderDialogOpen(true)}
                                    >
                                        <ReceiptText className="mr-1.5 h-4 w-4" />
                                        Lihat Pesanan
                                    </Button>
                                )}
                            </div>
                        )}
                        {!result && latestOrder && (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => setIsOrderDialogOpen(true)}
                            >
                                <ReceiptText className="mr-2 h-4 w-4" />
                                Lihat Pesanan #{latestOrder.id}
                            </Button>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}
