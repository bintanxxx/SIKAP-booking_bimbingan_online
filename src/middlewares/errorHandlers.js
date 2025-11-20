import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const globalErrorHandler = (err, req, res, next) => {
    // 1. Debugging (Penting: Cek error aslinya di terminal)
    console.error("🔥 ERROR LOG:", err); 

    // 2. Handle Zod Validation Error
    if (err instanceof ZodError) {
        return res.status(400).json({
            status: "validation_error",
            message: "Input tidak valid",
            errors: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            }))
        });
    }

    // 3. Handle Prisma Errors
    // Perhatikan: Pake 'PrismaClientKnownRequestError' (ada Request-nya)
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        
        // P2002: Unique Constraint (Misal: Email/NIM udah ada)
        if (err.code === "P2002") {
            const target = err.meta?.target;
            // target bisa berupa array atau string tergantung versi prisma
            const field = Array.isArray(target) ? target.join(", ") : target;
            
            return res.status(409).json({
                status: "fail",
                message: `Data pada field '${field}' sudah digunakan. Gunakan yang lain.`
            });
        }

        // P2025: Record Not Found (Misal: Update user yg gak ada)
        if (err.code === "P2025") {
            return res.status(404).json({
                status: "fail",
                message: "Data tidak ditemukan untuk diproses."
            });
        }

        // Error Prisma Lainnya
        return res.status(500).json({
            status: "error",
            message: "Database Error",
            code: err.code
        });
    }

    // 4. Handle Prisma Validation Error (Query Salah)
    if (err instanceof Prisma.PrismaClientValidationError) {
        return res.status(400).json({
            status: "error",
            message: "Format data database tidak valid (Type Mismatch)"
        });
    }

    // 5. Handle Generic / Unknown Error
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    return res.status(statusCode).json({
        status: "error",
        message: message
    });
    
    // Note: Gak perlu 'next()' lagi di sini karena semua udah di-return
};