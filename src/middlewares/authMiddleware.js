import jwt from 'jsonwebtoken';
export const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
            token = req.headers.authorization.split(' ')[1]
        }

        if(!token) {
            const error = new Error("Anda belum login, silakan login untuk mendapatkan akses")
            error.statusCode = 401
            throw error;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        req.user = {
            userId : decoded.userId,
            role: decoded.role
        }

        next()
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            const err = new Error("Token tidak valid. Akses ditolak")
            err.statusCode = 401
            next(err)
        } else if(error.name === 'TokenExpiredError') {
            const err = new Error("Sesi anda telah berakhir. Silakan Login kembali.")
            err.statusCode = 401
            next(err)
        } else {
            next(error)
        }
    }
}

export const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            const error = new Error("Anda tidak memiliki akses untuk melakukan ini")
            error.statusCode = 403
            next(error)
        }
        next()
    }
}