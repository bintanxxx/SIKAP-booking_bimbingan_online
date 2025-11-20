import express from 'express'

import {globalErrorHandler} from './middlewares/errorHandlers.js'
import {globalLimiter} from './middlewares/rateLimiters.js'

import authRoutes from './routes/authRoutes.js'
import scheduleRoutes from './routes/scheduleRoutes.js'
import {enableBigIntJSON} from './utils/bigIntJson.js'
enableBigIntJSON()
const app = express()
const port = 5000

app.use(express.json())

app.use(globalLimiter)

app.use('/api/auth/', authRoutes)
app.use('/api/schedule', scheduleRoutes)

// 2. Handle 404 (Route gak ketemu) - Opsional tapi bagus
// app.all('*', (req, res, next) => {
//   const err = new Error(`Can't find ${req.originalUrl} on this server!`);
//   err.statusCode = 404;
//   next(err);
// });

app.use(globalErrorHandler)

app.listen(port, () => {console.log(`API berjalan di http://localhost:${port}`)})

export default app;
