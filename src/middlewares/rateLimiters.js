import rateLimit from 'express-rate-limit'

export const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 menit
    max: 25, // 10 request per menit
    message :{
        status : "Error",
        message: "Terlalu banyak request. Coba lagi sebentar."
    },
    standardHeaders : true,
    legacyHeaders: false
})

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 MENIT
    max : 5,
    message: {
        status: "error",
        message: "Terlalu sering mencoba login. Tunggu sebentar."
    },
    standardHeaders: true,
    legacyHeaders: false,
})