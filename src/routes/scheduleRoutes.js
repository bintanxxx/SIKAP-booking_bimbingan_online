// src/routes/scheduleRoutes.js
import express from 'express';
import { createSchedule } from '../controllers/scheduleController.js';
import { protect, restrictTo } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js'; // Middleware Zod lu
import { createScheduleSchema } from '../validations/scheduleSchema.js'; // Schema di atas

const router = express.Router();

router.post('/', 
  protect,               // 1. Cek Login
  restrictTo('dosen'),   // 2. Cek Role Dosen
  validate(createScheduleSchema), // 3. Cek Data Valid gak? (Zod)
  createSchedule         // 4. Baru masuk Controller
);

export default router;