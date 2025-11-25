import { z } from 'zod';

// Schema dasar
const baseSchema = z.object({
  slot_duration: z.number().min(15).max(120).default(30),
});

export const createScheduleSchema = z.object({
  body: z.discriminatedUnion("type", [
    
    // === 1. SKEMA KHUSUS AD-HOC ===
    // Input: start_time & end_time (ISO String dengan Tanggal+Jam)
    baseSchema.extend({
      type: z.literal("ad_hoc"), // Pake literal, JANGAN enum
      start_time: z.string().datetime({ offset: true }),
      end_time: z.string().datetime({ offset: true }),
    }).refine((data) => new Date(data.end_time) > new Date(data.start_time), {
      message: "Waktu selesai harus setelah waktu mulai",
      path: ["end_time"]
    }),

    // === 2. SKEMA KHUSUS BLOK ===
    // Input: effective_dates (Tanggal) + start/end_jam (Jam String)
    baseSchema.extend({
      type: z.literal("blok"), // Ini eksklusif buat blok
      
      effective_start_date: z.string().date(), // YYYY-MM-DD
      effective_end_date: z.string().date(),
      
      start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam HH:mm"), // "08:00"
      end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam HH:mm"), // "12:00"

    }).refine((data) => {
      // Validasi Tanggal
      return new Date(data.effective_end_date) >= new Date(data.effective_start_date);
    }, {
      message: "Tanggal akhir periode tidak boleh sebelum tanggal mulai",
      path: ["effective_end_date"]
    }).refine((data) => {
      // Validasi Jam
      return data.end_time > data.start_time;
    }, {
      message: "Jam selesai harian harus setelah jam mulai",
      path: ["end_time"]
    }),

    baseSchema.extend({
      type: z.literal("rutin"),
      
      // 0=Minggu, 1=Senin, ..., 6=Sabtu
      day_of_week: z.number().int().min(0).max(6, "Hari harus antara 0 (Minggu) s/d 6 (Sabtu)"),
      
      // Request lu: Pake nama 'start_time' & 'end_time'
      // Tapi isinya JAM (HH:mm), bukan Tanggal
      start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu harus HH:mm (contoh: 13:00)"),
      end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format waktu harus HH:mm (contoh: 15:00)"),
      
      effective_start_date: z.string().date(), // YYYY-MM-DD
      effective_end_date: z.string().date(),

    }).refine((data) => new Date(data.effective_end_date) >= new Date(data.effective_start_date), {
      message: "Tanggal akhir periode tidak boleh sebelum tanggal mulai",
      path: ["effective_end_date"]
    }).refine((data) => data.end_time > data.start_time, {
      message: "Waktu selesai harus setelah waktu mulai",
      path: ["end_time"]
    })

  ])
});