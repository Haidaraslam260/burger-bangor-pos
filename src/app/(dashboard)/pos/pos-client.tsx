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
} from "lucide-react";
import { checkout } from "@/actions/checkout";
import { CURRENCY_FORMAT, PRODUCT_CATEGORIES } from "@/constants";
import type { CartItem, Cart } from "@/types";
import type { TransactionType, Product } from "@/db/schema";

interface POSClientProps {
    products: Product[];
}

export default function POSClient({ products }: POSClientProps) {
    const [cart, setCart] = useState<Cart>({ items: [], totalAmount: 0, itemCount: 0 });
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [transactionType, setTransactionType] = useState<TransactionType>("dine_in");
    const [customerName, setCustomerName] = useState("");
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [checkoutResult, setCheckoutResult] = useState<{ success: boolean; message: string } | null>(null);

    // Filter products
    const filteredProducts = products.filter((product) => {
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Add to cart
    function addToCart(product: Product) {
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
        setCart((prev) => {
            const updatedItems = prev.items
                .map((item) =>
                    item.productId === productId
                        ? {
                            ...item,
                            quantity: item.quantity + delta,
                            subtotal: (item.quantity + delta) * item.unitPrice,
                        }
                        : item
                )
                .filter((item) => item.quantity > 0);

            return calculateCart(updatedItems);
        });
    }

    // Clear cart
    function clearCart() {
        setCart({ items: [], totalAmount: 0, itemCount: 0 });
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
        setIsProcessing(true);
        setCheckoutResult(null);

        const formData = new FormData();
        formData.append(
            "data",
            JSON.stringify({
                items: cart.items,
                type: transactionType,
                customerName: customerName || undefined,
            })
        );

        const result = await checkout(formData);

        setCheckoutResult({ success: result.success, message: result.message });

        if (result.success) {
            setTimeout(() => {
                clearCart();
                setCustomerName("");
                setIsCheckoutOpen(false);
                setCheckoutResult(null);
            }, 2000);
        }

        setIsProcessing(false);
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
                            className={selectedCategory === "all" ? "bg-orange-500 hover:bg-orange-600" : ""}
                        >
                            Semua
                        </Button>
                        {PRODUCT_CATEGORIES.map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                                className={selectedCategory === category ? "bg-orange-500 hover:bg-orange-600" : ""}
                            >
                                {category}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Products */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredProducts.map((product) => (
                            <Card
                                key={product.id}
                                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] group"
                                onClick={() => addToCart(product)}
                            >
                                <CardContent className="p-4">
                                    <div className="aspect-square bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                                        {/* Fallback to icon if no URL, but using icon for now to match style */}
                                        <UtensilsCrossed className="h-12 w-12 text-orange-500" />
                                    </div>
                                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                                    <Badge variant="secondary" className="mt-1 text-xs">
                                        {product.category}
                                    </Badge>
                                    <p className="text-orange-600 dark:text-orange-400 font-bold mt-2">
                                        {CURRENCY_FORMAT.format(Number(product.price))}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
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
                    <div className="p-4 flex-1 overflow-hidden flex flex-col">
                        {/* Transaction Type */}
                        <div className="flex gap-2 mb-4">
                            <Button
                                variant={transactionType === "dine_in" ? "default" : "outline"}
                                className={`flex-1 ${transactionType === "dine_in" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                                onClick={() => setTransactionType("dine_in")}
                            >
                                <UtensilsCrossed className="h-4 w-4 mr-2" />
                                Dine In
                            </Button>
                            <Button
                                variant={transactionType === "take_away" ? "default" : "outline"}
                                className={`flex-1 ${transactionType === "take_away" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
                                onClick={() => setTransactionType("take_away")}
                            >
                                <ShoppingBag className="h-4 w-4 mr-2" />
                                Take Away
                            </Button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {cart.items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground pb-12">
                                    <div className="bg-muted p-6 rounded-full mb-4">
                                        <ShoppingCart className="h-10 w-10 opacity-30" />
                                    </div>
                                    <p className="font-medium">Keranjang kosong</p>
                                    <p className="text-sm">Klik menu untuk menambahkan</p>
                                </div>
                            ) : (
                                cart.items.map((item) => (
                                    <div key={item.productId} className="flex items-center gap-3 p-3 bg-background border rounded-lg shadow-sm">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{item.productName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {CURRENCY_FORMAT.format(item.unitPrice)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 rounded-lg"
                                                onClick={() => updateQuantity(item.productId, -1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7 rounded-lg"
                                                onClick={() => updateQuantity(item.productId, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Totals & Checkout */}
                    {cart.items.length > 0 && (
                        <div className="p-4 bg-background border-t shadow-up-lg z-10">
                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal ({cart.itemCount} item)</span>
                                    <span>{CURRENCY_FORMAT.format(cart.totalAmount)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span className="text-orange-600 dark:text-orange-400">
                                        {CURRENCY_FORMAT.format(cart.totalAmount)}
                                    </span>
                                </div>
                            </div>
                            <Button
                                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md transition-all hover:shadow-lg"
                                onClick={() => setIsCheckoutOpen(true)}
                            >
                                Bayar Sekarang
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
                        <DialogDescription>
                            Pastikan pesanan sudah benar sebelum melanjutkan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Pelanggan (opsional)</label>
                            <Input
                                placeholder="Nama pelanggan"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
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
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total Bayar</span>
                                <span className="text-orange-600">
                                    {CURRENCY_FORMAT.format(cart.totalAmount)}
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

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsCheckoutOpen(false)}
                            disabled={isProcessing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleCheckout}
                            disabled={isProcessing || checkoutResult?.success}
                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
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
        </div>
    );
}
