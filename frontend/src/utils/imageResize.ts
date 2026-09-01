// utils/imageResize.ts
// Yüklemeden önce görseli tarayıcıda küçültür — bucket'a büyük dosya gitmesini
// ve karşı tarafın yavaş internetle beklemesini engeller.

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export async function resizeImage(file: File): Promise<File> {
    // GIF'i olduğu gibi bırak (animasyon bozulmasın), diğer resim dışı tipleri de dokunma
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
        return file;
    }

    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        return file; // tarayıcı desteklemiyorsa orijinali gönder
    }

    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

    // Zaten küçükse yeniden kodlamaya gerek yok
    if (scale >= 1 && file.size < 1.5 * 1024 * 1024) {
        bitmap.close?.();
        return file;
    }

    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
        bitmap.close?.();
        return file;
    }

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );

    if (!blob) return file;

    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
}