import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const globalErrorHandler = (err, req, res, next) => {
    // DEBUGGING: Liat struktur error aslinya di terminal
    // console.error("🔥 ERROR RAW:", JSON.stringify(err, null, 2));

    // 1. Handle Zod Validation Error (Versi Lebih Aman)
    // Kita cek instanceof ATAU kalo namanya 'ZodError'
    if (err instanceof ZodError || err.name === 'ZodError') {
        // Kadang zod nyimpen di .errors, kadang di .issues. Kita ambil yang ada.
        const issues = err.errors || err.issues || [];
        
        return res.status(400).json({
            status: "validation_error",
            message: "Input data tidak valid",
            errors: issues.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            }))
        });
    }

    // 2. Handle Prisma Errors (Sama kayak sebelumnya)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            const target = err.meta?.target;
            const field = Array.isArray(target) ? target.join(", ") : target;
            return res.status(409).json({
                status: "fail",
                message: `Data pada field '${field}' sudah digunakan.`
            });
        }
        if (err.code === "P2025") {
            return res.status(404).json({
                status: "fail",
                message: "Data tidak ditemukan."
            });
        }
    }

    // 3. Handle Generic Error
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    return res.status(statusCode).json({
        status: "error",
        message: message
    });
};