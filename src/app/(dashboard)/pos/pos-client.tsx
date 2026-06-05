"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    UtensilsCrossed,
    ShoppingBag,
    Loader2,
    Search,
    Banknote,
    CreditCard,
    QrCode,
    Wallet,
    Printer,
    ReceiptText,
    Percent,
    Tag,
    AlertTriangle,
} from "lucide-react";
import { checkout } from "@/actions/checkout";
import { CURRENCY_FORMAT, PAYMENT_METHOD_LABELS, PRODUCT_CATEGORIES } from "@/constants";
import type { CartItem, Cart } from "@/types";
import type { PaymentMethod, TransactionType, Product } from "@/db/schema";

interface POSClientProps {
    products: Product[];
    availabilityByProductId: Record<number, number | null>;
}

interface ReceiptData {
    transactionId: number;
    invoiceNumber: string;
    transactionDate: Date;
    items: CartItem[];
    itemCount: number;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    roundingAmount: number;
    totalAmount: number;
    promoCode?: string;
    type: TransactionType;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    changeAmount: number;
    customerName?: string;
}

type DiscountMode = "amount" | "percent";

function createInvoiceNumber(transactionId: number, date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `BB-${year}${month}${day}-${String(transactionId).padStart(5, "0")}`;
}

function formatReceiptDate(date: Date) {
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export default function POSClient({ products, availabilityByProductId }: POSClientProps) {
    const [cart, setCart] = useState<Cart>({ items: [], totalAmount: 0, itemCount: 0 });
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [transactionType, setTransactionType] = useState<TransactionType>("dine_in");
    const [promoCode, setPromoCode] = useState("");
    const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
    const [discountValue, setDiscountValue] = useState("");
    const [isTaxEnabled, setIsTaxEnabled] = useState(true);
    const [taxRate, setTaxRate] = useState("10");
    const [isServiceChargeEnabled, setIsServiceChargeEnabled] = useState(false);
    const [serviceChargeRate, setServiceChargeRate] = useState("5");
    const [isRoundingEnabled, setIsRoundingEnabled] = useState(true);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
    const [cashAmount, setCashAmount] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutResult, setCheckoutResult] = useState<{ success: boolean; message: string } | null>(null);
    const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

    const subtotalAmount = cart.totalAmount;
    const discountRate = Math.max(Number(discountValue || 0), 0);
    const rawDiscountAmount = discountMode === "percent"
        ? subtotalAmount * Math.min(discountRate, 100) / 100
        : discountRate;
    const discountAmount = Math.min(Math.round(rawDiscountAmount), subtotalAmount);
    const taxableAmount = Math.max(subtotalAmount - discountAmount, 0);
    const taxAmount = isTaxEnabled
        ? Math.round(taxableAmount * Math.max(Number(taxRate || 0), 0) / 100)
        : 0;
    const serviceChargeAmount = isServiceChargeEnabled
        ? Math.round(taxableAmount * Math.max(Number(serviceChargeRate || 0), 0) / 100)
        : 0;
    const totalBeforeRounding = taxableAmount + taxAmount + serviceChargeAmount;
    const roundingAmount = isRoundingEnabled
        ? Math.round(totalBeforeRounding / 100) * 100 - totalBeforeRounding
        : 0;
    const finalTotalAmount = Math.max(totalBeforeRounding + roundingAmount, 0);
    const amountPaid = paymentMethod === "cash"
        ? Number(cashAmount || 0)
        : finalTotalAmount;
    const changeAmount = paymentMethod === "cash"
        ? Math.max(amountPaid - finalTotalAmount, 0)
        : 0;
    const isPaymentInsufficient = paymentMethod === "cash" && amountPaid < finalTotalAmount;
    const stockWarnings = cart.items.flatMap((item) => {
        const availability = availabilityByProductId[item.productId];
        if (availability === null || availability === undefined) return [];
        if (item.quantity > availability) {
            return [`${item.productName} hanya tersedia ${availability} porsi`];
        }
        return [];
    });
    const hasStockWarning = stockWarnings.length > 0;

    function getProductAvailability(productId: number) {
        return availabilityByProductId[productId];
    }

    // Filter products
    const filteredProducts = products.filter((product) => {
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Add to cart
    function addToCart(product: Product) {
        const availability = getProductAvailability(product.id);
        const currentQuantity = cart.items.find((item) => item.productId === product.id)?.quantity ?? 0;

        if (availability !== null && availability !== undefined && availability <= currentQuantity) {
            setCheckoutResult({
                success: false,
                message: `${product.name} hanya tersedia ${availability} porsi`,
            });
            return;
        }

        setCart((prev) => {
            const existingItem = prev.items.find((item) => item.productId === product.id);
            const price = Number(product.price);

            if (existingItem) {
                const updatedItems = prev.items.map((item) =>
                    item.productId === product.id
                        ? {
                            ...item,
                            quantity: item.quantity + 1,
                            subtotal: (item.quantity + 1) * item.unitPrice,
                        }
                        : item
                );
                return calculateCart(updatedItems);
            }

            const newItem: CartItem = {
                productId: product.id,
                productName: product.name,
                unitPrice: price,
                quantity: 1,
                subtotal: price,
            };

            return calculateCart([...prev.items, newItem]);
        });
    }

    // Update quantity
    function updateQuantity(productId: number, delta: number) {
        const availability = getProductAvailability(productId);

        setCart((prev) => {
            const updatedItems = prev.items
                .map((item) => {
                    if (item.productId !== productId) return item;

                    const nextQuantity = item.quantity + delta;
                    const cappedQuantity = availability !== null && availability !== undefined
                        ? Math.min(nextQuantity, availability)
                        : nextQuantity;

                    if (nextQuantity > cappedQuantity) {
                        setCheckoutResult({
                            success: false,
                            message: `${item.productName} hanya tersedia ${availability} porsi`,
                        });
                    }

                    return {
                        ...item,
                        quantity: cappedQuantity,
                        subtotal: cappedQuantity * item.unitPrice,
                    };
                })
                .filter((item) => item.quantity > 0);

            return calculateCart(updatedItems);
        });
    }

    // Clear cart
    function clearCart() {
        setCart({ items: [], totalAmount: 0, itemCount: 0 });
        setPromoCode("");
        setDiscountValue("");
        setPaymentMethod("cash");
        setCashAmount("");
    }

    // Calculate cart totals
    function calculateCart(items: CartItem[]): Cart {
        return {
            items,
            totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
            itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        };
    }

    // Handle checkout
    async function handleCheckout() {
        if (hasStockWarning) {
            setCheckoutResult({
                success: false,
                message: stockWarnings[0],
            });
            return;
        }

        if (isPaymentInsufficient) {
            setCheckoutResult({
                success: false,
                message: "Jumlah bayar cash kurang dari total transaksi",
            });
            return;
        }

        setIsProcessing(true);
        setCheckoutResult(null);

        const formData = new FormData();
        formData.append(
            "data",
            JSON.stringify({
                items: cart.items,
                type: transactionType,
                subtotalAmount,
                discountAmount,
                taxAmount,
                serviceChargeAmount,
                roundingAmount,
                totalAmount: finalTotalAmount,
                promoCode: promoCode.trim() || undefined,
                paymentMethod,
                amountPaid,
                changeAmount,
                paymentStatus: "paid",
                customerName: customerName || undefined,
            })
        );

        const result = await checkout(formData);

        setCheckoutResult({
            success: result.success,
            message: result.error || result.message,
        });

        if (result.success) {
            if (!result.transactionId) {
                setCheckoutResult({
                    success: false,
                    message: "Transaksi berhasil, tetapi nomor transaksi tidak diterima",
                });
                setIsProcessing(false);
                return;
            }

            const transactionDate = new Date();
            const transactionId = result.transactionId;

            setReceiptData({
                transactionId,
                invoiceNumber: createInvoiceNumber(transactionId, transactionDate),
                transactionDate,
                items: cart.items.map((item) => ({ ...item })),
                itemCount: cart.itemCount,
                subtotalAmount,
                discountAmount,
                taxAmount,
                serviceChargeAmount,
                roundingAmount,
                totalAmount: finalTotalAmount,
                promoCode: promoCode.trim() || undefined,
                type: transactionType,
                paymentMethod,
                amountPaid,
                changeAmount,
                customerName: customerName || undefined,
            });

            clearCart();
            setCustomerName("");
            setIsCheckoutOpen(false);
            setCheckoutResult(null);
        }

        setIsProcessing(false);
    }

    function handlePrintReceipt() {
        window.print();
    }

    return (
        <div className="flex gap-6 h-[calc(100vh-8rem)]">
            {/* Products Grid */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Search & Filters */}
                <div className="mb-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari menu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <Button
                            variant={selectedCategory === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("all")}
                            className={selectedCategory === "all" ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                        >
                            Semua
                        </Button>
                        {PRODUCT_CATEGORIES.map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                                className={selectedCategory === category ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                            >
                                {category}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Products */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredProducts.map((product) => {
                            const availability = getProductAvailability(product.id);
                            const isUnavailable = availability !== null && availability !== undefined && availability <= 0;
                            const isLimited = availability !== null && availability !== undefined && availability > 0 && availability <= 5;

                            return (
                                <Card
                                    key={product.id}
                                    className={`transition-all group ${isUnavailable
                                        ? "opacity-60 cursor-not-allowed"
                                        : "cursor-pointer hover:shadow-lg hover:scale-[1.02]"
                                        }`}
                                    onClick={() => {
                                        if (!isUnavailable) addToCart(product);
                                    }}
                                >
                                    <CardContent className="p-4">
                                        <div className="aspect-square bg-gradient-to-br from-[#F1FFD0] to-[#E3FF9F] dark:from-[#A3DF02]/20 dark:to-[#6f9900]/20 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                                            {product.imageUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <UtensilsCrossed className={`h-12 w-12 ${isUnavailable ? "text-muted-foreground" : "text-[#A3DF02]"}`} />
                                            )}
                                            {(isUnavailable || isLimited) && (
                                                <Badge
                                                    variant={isUnavailable ? "destructive" : "outline"}
                                                    className="absolute top-2 right-2 bg-background/90"
                                                >
                                                    {isUnavailable ? "Habis" : `Sisa ${availability}`}
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="font-medium text-sm truncate">{product.name}</h3>
                                        <Badge variant="secondary" className="mt-1 text-xs">
                                            {product.category}
                                        </Badge>
                                        <p className="text-[#6f9900] dark:text-[#B8F23A] font-bold mt-2">
                                            {CURRENCY_FORMAT.format(Number(product.price))}
                                        </p>
                                        {availability === null && (
                                            <p className="text-xs text-muted-foreground mt-1">Tanpa resep stok</p>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full py-12 text-center text-muted-foreground">
                                <Search className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Tidak ada produk yang sesuai filter</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cart Sidebar */}
            <Card className="w-96 flex flex-col h-full">
                <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Keranjang
                        </CardTitle>
                        {cart.items.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Hapus
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden bg-muted/10">
                    <div className="p-3 flex-1 overflow-hidden flex flex-col">
                        {/* Transaction Type */}
                        <div className="flex gap-2 mb-3">
                            <Button
                                variant={transactionType === "dine_in" ? "default" : "outline"}
                                className={`h-10 flex-1 ${transactionType === "dine_in" ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}`}
                                onClick={() => setTransactionType("dine_in")}
                            >
                                <UtensilsCrossed className="h-4 w-4 mr-2" />
                                Dine In
                            </Button>
                            <Button
                                variant={transactionType === "take_away" ? "default" : "outline"}
                                className={`h-10 flex-1 ${transactionType === "take_away" ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}`}
                                onClick={() => setTransactionType("take_away")}
                            >
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                Take Away
                            </Button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                            {cart.items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground pb-12">
                                    <div className="bg-muted p-6 rounded-full mb-4">
                                        <ShoppingCart className="h-10 w-10 opacity-30" />
                                    </div>
                                    <p className="font-medium">Keranjang kosong</p>
                                    <p className="text-sm">Klik menu untuk menambahkan</p>
                                </div>
                            ) : (
                                cart.items.map((item) => {
                                    const availability = getProductAvailability(item.productId);
                                    const isOverStock = availability !== null && availability !== undefined && item.quantity > availability;
                                    const isMaxQuantity = availability !== null && availability !== undefined && item.quantity >= availability;

                                    return (
                                        <div key={item.productId} className="border-l-2 border-[#D6F58A] bg-background px-3 py-2">
                                            <div className="grid grid-cols-[1fr_auto] gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold leading-5">{item.productName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.quantity} x {CURRENCY_FORMAT.format(item.unitPrice)}
                                                    </p>
                                                </div>
                                                <p className="shrink-0 text-sm font-bold leading-5 text-[#6f9900]">
                                                    {CURRENCY_FORMAT.format(item.subtotal)}
                                                </p>
                                            </div>

                                            <div className="mt-1.5 flex items-center justify-between gap-2">
                                                <div className="flex h-7 items-center rounded-md border bg-muted/20">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-r-none"
                                                        onClick={() => updateQuantity(item.productId, -1)}
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-l-none"
                                                        onClick={() => updateQuantity(item.productId, 1)}
                                                        disabled={isMaxQuantity}
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>

                                                <div className="flex min-w-0 items-center gap-2">
                                                    {isOverStock ? (
                                                        <span className="truncate text-xs font-medium text-red-600">
                                                            Stok kurang
                                                        </span>
                                                    ) : availability !== null && availability !== undefined && availability <= 5 ? (
                                                        <span className="truncate text-xs text-[#6f9900]">
                                                            Sisa {availability}
                                                        </span>
                                                    ) : null}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 shrink-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                        onClick={() => updateQuantity(item.productId, -item.quantity)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Totals & Checkout */}
                    {cart.items.length > 0 && (
                        <div className="p-3 bg-background border-t shadow-up-lg z-10">
                            <div className="space-y-2 mb-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal ({cart.itemCount} item)</span>
                                    <span>{CURRENCY_FORMAT.format(subtotalAmount)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Diskon</span>
                                        <span>-{CURRENCY_FORMAT.format(discountAmount)}</span>
                                    </div>
                                )}
                                {taxAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Pajak</span>
                                        <span>{CURRENCY_FORMAT.format(taxAmount)}</span>
                                    </div>
                                )}
                                {serviceChargeAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Service</span>
                                        <span>{CURRENCY_FORMAT.format(serviceChargeAmount)}</span>
                                    </div>
                                )}
                                {roundingAmount !== 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Pembulatan</span>
                                        <span>{CURRENCY_FORMAT.format(roundingAmount)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between text-base font-bold">
                                    <span>Total</span>
                                    <span className="text-[#6f9900] dark:text-[#B8F23A]">
                                        {CURRENCY_FORMAT.format(finalTotalAmount)}
                                    </span>
                                </div>
                            </div>
                            <Button
                                className="w-full h-10 text-base font-bold bg-[#A3DF02] text-black hover:bg-[#92c902] shadow-md transition-all hover:shadow-lg"
                                onClick={() => setIsCheckoutOpen(true)}
                                disabled={hasStockWarning}
                            >
                                {hasStockWarning ? "Stok Tidak Cukup" : "Bayar Sekarang"}
                            </Button>
                            {hasStockWarning && (
                                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>{stockWarnings[0]}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg">
                    <DialogHeader className="border-b px-5 py-4">
                        <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
                        <DialogDescription>
                            Pastikan pesanan sudah benar sebelum melanjutkan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Pelanggan (opsional)</label>
                            <Input
                                placeholder="Nama pelanggan"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-1">
                                    <Tag className="h-3.5 w-3.5" />
                                    Kode Promo
                                </label>
                                <Input
                                    placeholder="PROMO10"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-1">
                                    <Percent className="h-3.5 w-3.5" />
                                    Diskon
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder={discountMode === "percent" ? "10" : "10000"}
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-14 shrink-0"
                                        onClick={() => setDiscountMode(discountMode === "amount" ? "percent" : "amount")}
                                    >
                                        {discountMode === "percent" ? "%" : "Rp"}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                type="button"
                                variant={isTaxEnabled ? "default" : "outline"}
                                className={isTaxEnabled ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                                onClick={() => setIsTaxEnabled((value) => !value)}
                            >
                                Pajak
                            </Button>
                            <Input
                                type="number"
                                min="0"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                disabled={!isTaxEnabled}
                            />
                            <div className="flex items-center text-sm text-muted-foreground">%</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                type="button"
                                variant={isServiceChargeEnabled ? "default" : "outline"}
                                className={isServiceChargeEnabled ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                                onClick={() => setIsServiceChargeEnabled((value) => !value)}
                            >
                                Service
                            </Button>
                            <Input
                                type="number"
                                min="0"
                                value={serviceChargeRate}
                                onChange={(e) => setServiceChargeRate(e.target.value)}
                                disabled={!isServiceChargeEnabled}
                            />
                            <div className="flex items-center text-sm text-muted-foreground">%</div>
                        </div>

                        <Button
                            type="button"
                            variant={isRoundingEnabled ? "default" : "outline"}
                            className={`w-full ${isRoundingEnabled ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}`}
                            onClick={() => setIsRoundingEnabled((value) => !value)}
                        >
                            Pembulatan Rp 100
                        </Button>

                        <div className="bg-muted/50 rounded-lg border p-3 space-y-2">
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-muted-foreground">Tipe Transaksi</span>
                                <Badge variant="secondary" className="font-normal">
                                    {transactionType === "dine_in" ? "Dine In" : "Take Away"}
                                </Badge>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-muted-foreground">Total Item</span>
                                <span className="font-medium">{cart.itemCount} item</span>
                            </div>
                            <div className="flex justify-between text-sm items-center">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{CURRENCY_FORMAT.format(subtotalAmount)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm items-center text-green-600">
                                    <span>Diskon{promoCode ? ` (${promoCode})` : ""}</span>
                                    <span>-{CURRENCY_FORMAT.format(discountAmount)}</span>
                                </div>
                            )}
                            {taxAmount > 0 && (
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">Pajak</span>
                                    <span>{CURRENCY_FORMAT.format(taxAmount)}</span>
                                </div>
                            )}
                            {serviceChargeAmount > 0 && (
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">Service</span>
                                    <span>{CURRENCY_FORMAT.format(serviceChargeAmount)}</span>
                                </div>
                            )}
                            {roundingAmount !== 0 && (
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground">Pembulatan</span>
                                    <span>{CURRENCY_FORMAT.format(roundingAmount)}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between text-base font-bold">
                                <span>Total Bayar</span>
                                <span className="text-[#6f9900]">
                                    {CURRENCY_FORMAT.format(finalTotalAmount)}
                                </span>
                            </div>
                        </div>

                        {hasStockWarning && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{stockWarnings[0]}</span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <label className="text-sm font-medium">Metode Pembayaran</label>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={paymentMethod === "cash" ? "default" : "outline"}
                                    className={paymentMethod === "cash" ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                                    onClick={() => setPaymentMethod("cash")}
                                >
                                    <Banknote className="h-4 w-4 mr-2" />
                                    Cash
                                </Button>
                                <Button
                                    type="button"
                                    variant={paymentMethod === "qris" ? "default" : "outline"}
                                    className={paymentMethod === "qris" ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                                    onClick={() => setPaymentMethod("qris")}
                                >
                                    <QrCode className="h-4 w-4 mr-2" />
                                    QRIS
                                </Button>
                                <Button
                                    type="button"
                                    variant={paymentMethod === "debit" ? "default" : "outline"}
                                    className={paymentMethod === "debit" ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                                    onClick={() => setPaymentMethod("debit")}
                                >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Debit
                                </Button>
                                <Button
                                    type="button"
                                    variant={paymentMethod === "e_wallet" ? "default" : "outline"}
                                    className={paymentMethod === "e_wallet" ? "bg-[#A3DF02] text-black hover:bg-[#92c902]" : ""}
                                    onClick={() => setPaymentMethod("e_wallet")}
                                >
                                    <Wallet className="h-4 w-4 mr-2" />
                                    E-Wallet
                                </Button>
                            </div>
                        </div>

                        {paymentMethod === "cash" ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Jumlah Bayar</label>
                                <Input
                                    type="number"
                                    min={finalTotalAmount}
                                    step="1000"
                                    placeholder="Masukkan nominal cash"
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pembayaran</span>
                                    <span className="font-medium">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
                                </div>
                            </div>
                        )}

                        <div className="rounded-lg border p-3 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Dibayar</span>
                                <span>{CURRENCY_FORMAT.format(amountPaid)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Kembalian</span>
                                <span className={isPaymentInsufficient ? "text-red-600 font-medium" : "font-medium"}>
                                    {isPaymentInsufficient
                                        ? `Kurang ${CURRENCY_FORMAT.format(finalTotalAmount - amountPaid)}`
                                        : CURRENCY_FORMAT.format(changeAmount)}
                                </span>
                            </div>
                        </div>

                        {checkoutResult && (
                            <div
                                className={`p-3 rounded-lg flex items-start gap-2 ${checkoutResult.success
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
                                    }`}
                            >
                                <UtensilsCrossed className="h-5 w-5 shrink-0 mt-0.5" />
                                <p className="text-sm font-medium">
                                    {checkoutResult.message}
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t bg-background px-5 py-4 gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsCheckoutOpen(false)}
                            disabled={isProcessing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleCheckout}
                            disabled={isProcessing || checkoutResult?.success || isPaymentInsufficient || hasStockWarning}
                            className="bg-[#A3DF02] text-black hover:bg-[#92c902]"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                "Konfirmasi Bayar"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={receiptData !== null} onOpenChange={(open) => !open && setReceiptData(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="receipt-print-actions">
                        <DialogTitle className="flex items-center gap-2">
                            <ReceiptText className="h-5 w-5" />
                            Struk Transaksi
                        </DialogTitle>
                        <DialogDescription>
                            Struk siap dicetak untuk printer thermal.
                        </DialogDescription>
                    </DialogHeader>

                    {receiptData && (
                        <div
                            id="receipt-print-area"
                            className="mx-auto w-full max-w-[320px] bg-white text-black font-mono text-xs leading-tight border rounded-md p-4"
                        >
                            <div className="text-center space-y-1">
                                <p className="text-base font-bold tracking-wide">BURGER BANGOR</p>
                                <p>POS & Inventory System</p>
                                <p>--------------------------------</p>
                            </div>

                            <div className="space-y-1 py-3">
                                <div className="flex justify-between gap-3">
                                    <span>Invoice</span>
                                    <span className="text-right">{receiptData.invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span>Tanggal</span>
                                    <span className="text-right">{formatReceiptDate(receiptData.transactionDate)}</span>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <span>Tipe</span>
                                    <span>{receiptData.type === "dine_in" ? "Dine In" : "Take Away"}</span>
                                </div>
                                {receiptData.customerName && (
                                    <div className="flex justify-between gap-3">
                                        <span>Customer</span>
                                        <span className="text-right">{receiptData.customerName}</span>
                                    </div>
                                )}
                                {receiptData.promoCode && (
                                    <div className="flex justify-between gap-3">
                                        <span>Promo</span>
                                        <span className="text-right">{receiptData.promoCode}</span>
                                    </div>
                                )}
                            </div>

                            <p>--------------------------------</p>

                            <div className="space-y-2 py-3">
                                {receiptData.items.map((item) => (
                                    <div key={item.productId} className="space-y-1">
                                        <p className="font-semibold">{item.productName}</p>
                                        <div className="flex justify-between gap-3">
                                            <span>
                                                {item.quantity} x {CURRENCY_FORMAT.format(item.unitPrice)}
                                            </span>
                                            <span>{CURRENCY_FORMAT.format(item.subtotal)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p>--------------------------------</p>

                            <div className="space-y-1 py-3">
                                <div className="flex justify-between">
                                    <span>Total Item</span>
                                    <span>{receiptData.itemCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{CURRENCY_FORMAT.format(receiptData.subtotalAmount)}</span>
                                </div>
                                {receiptData.discountAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span>Diskon</span>
                                        <span>-{CURRENCY_FORMAT.format(receiptData.discountAmount)}</span>
                                    </div>
                                )}
                                {receiptData.taxAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span>Pajak</span>
                                        <span>{CURRENCY_FORMAT.format(receiptData.taxAmount)}</span>
                                    </div>
                                )}
                                {receiptData.serviceChargeAmount > 0 && (
                                    <div className="flex justify-between">
                                        <span>Service</span>
                                        <span>{CURRENCY_FORMAT.format(receiptData.serviceChargeAmount)}</span>
                                    </div>
                                )}
                                {receiptData.roundingAmount !== 0 && (
                                    <div className="flex justify-between">
                                        <span>Pembulatan</span>
                                        <span>{CURRENCY_FORMAT.format(receiptData.roundingAmount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>{CURRENCY_FORMAT.format(receiptData.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Metode</span>
                                    <span>{PAYMENT_METHOD_LABELS[receiptData.paymentMethod]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Dibayar</span>
                                    <span>{CURRENCY_FORMAT.format(receiptData.amountPaid)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Kembali</span>
                                    <span>{CURRENCY_FORMAT.format(receiptData.changeAmount)}</span>
                                </div>
                            </div>

                            <p>--------------------------------</p>
                            <div className="text-center space-y-1 pt-3">
                                <p>Terima kasih</p>
                                <p>Simpan struk ini sebagai bukti pembayaran</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="receipt-print-actions gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setReceiptData(null)}>
                            Tutup
                        </Button>
                        <Button
                            className="bg-[#A3DF02] text-black hover:bg-[#92c902]"
                            onClick={handlePrintReceipt}
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Cetak Struk
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
