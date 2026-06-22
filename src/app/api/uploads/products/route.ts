import { auth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const PRODUCT_IMAGES_BUCKET = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";
const ALLOWED_TYPES = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"],
]);

function sanitizeFileName(value: string) {
    return value
        .toLowerCase()
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "product";
}

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user || !["admin", "manager"].includes(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "File gambar wajib diisi" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Format gambar harus JPG, PNG, WEBP, atau GIF" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: "Ukuran gambar maksimal 2MB" }, { status: 400 });
    }

    const extension = ALLOWED_TYPES.get(file.type);
    const baseName = sanitizeFileName(file.name);
    const fileName = `products/${baseName}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const supabase = await createServiceClient();
    const bytes = await file.arrayBuffer();

    const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(fileName, bytes, {
            cacheControl: "31536000",
            contentType: file.type,
            upsert: false,
        });

    if (error) {
        console.error("Upload product image to Supabase error:", error);
        return NextResponse.json({
            error: "Gagal upload gambar ke storage. Pastikan bucket Supabase sudah dibuat dan public.",
        }, { status: 500 });
    }

    const { data } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(fileName);

    return NextResponse.json({
        path: data.publicUrl,
        storagePath: fileName,
    });
}
