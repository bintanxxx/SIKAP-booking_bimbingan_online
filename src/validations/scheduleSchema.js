import { z } from 'zod';

// Schema dasar yang sama di semua tipe
const baseSchema = z.object({
  slot_duration: z.number().min(15).max(120).default(30),
});

export const createScheduleSchema = z.object({
  body: z.discriminatedUnion("type", [
    
    // === ATURAN 1: BUAT AD-HOC / BLOK ===
    baseSchema.extend({
      type: z.enum(["ad_hoc", "blok"]),
      start_time: z.string().datetime({offset: true}),
      end_time: z.string().datetime({offset: true}),
    }).refine((data) => new Date(data.end_time) > new Date(data.start_time), {
      message: "End time harus setelah start time",
      path: ["end_time"]
    }),

    // === ATURAN 2: BUAT RUTIN ===
    baseSchema.extend({
      type: z.literal("rutin"),
      day_of_week: z.number().min(0).max(6), // 0-6
      rutin_start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam harus HH:mm"),
      rutin_end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam harus HH:mm"),
      effective_start_date: z.string().date(), // YYYY-MM-DD
      effective_end_date: z.string().date(),
    })
  ])
});