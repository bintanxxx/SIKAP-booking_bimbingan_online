import prisma from '../utils/prisma.js'
import dayjs from '../utils/dateUtils.js'

export const createAdhocSchedule = async (dosenUserId, data) => {
    // data nanti isinya (start_time, end_time, slot_duration)

    //1. Konversi string ke objek dayjs
    // biar bisa ditambah kurang waktunya

    const startTime = dayjs(data.start_time);
    const endTime = dayjs(data.end_time)
    const durationMinutes = data.slot_duration || 30

    // periksa apakah slot lebih besar daripada total waktu yang tersedia
    // misal durasi slot 90 menit tapi buka jadwal hanya 1 jam
    const totalDuration = endTime.diff(startTime, 'minute');
    if(totalDuration < durationMinutes) {
        throw new Error("Durasi slot tidak boleh lebih besar total waktu jadwal")
    }

    // 2. cek jadwal bentrok
    // Jadwal Baru Bentrok JIKA: (Start Baru < End Lama) DAN (End Baru > Start Lama)
    const conflictSchedule = await prisma.availability_schedules.findFirst({
        where : {
            dosen_user_id: dosenUserId,
            AND : [
                // start baru lebih kecil dari end lama
                {start_time: {lt: endTime.toDate()}},
                // end baru lebih besar dari start lama
                {end_time : {gt: startTime.toDate()}}
            ]   
        }
    })

    if (conflictSchedule) {
        // Biar error message-nya enak dibaca
        const conflictStart = dayjs(conflictSchedule.start_time).format("HH:mm");
        const conflictEnd = dayjs(conflictSchedule.end_time).format("HH:mm");
        const conflictDate = dayjs(conflictSchedule.start_time).format("DD MMM YYYY");

        throw new Error(
        `Gagal membuat jadwal. Waktu yang dipilih bentrok dengan jadwal Anda pada tanggal ${conflictDate} (${conflictStart} - ${conflictEnd}).`
        );
    }

    // 3. Generate slot (looping)
    const slotToCreate = []

    // pointer waktu (kursor), mulai dari jam start
    let currentTime = startTime

    // Lakukan Looping:
    // "Selama (Waktu Sekarang + Durasi Slot) masih KURANG DARI atau SAMA DENGAN Waktu Selesai..."
    while(currentTime.add(durationMinutes, 'minute').isSameOrBefore(endTime)){
        // hitung jam selesai untuk slot ini
        // add.(30, 'minute') artinya nambahin 30 menit ke depan
        const slotEndTime = currentTime.add(durationMinutes, 'minute')

        slotToCreate.push({
            dosen_user_id: dosenUserId,
            start_time: currentTime.toDate(),
            end_time: slotEndTime.toDate(),
            status: 'available'
        })

        // Geser pointer ke slot berikutnya
        // Misal slot 1 (08:00-08:30), maka slot 2 mulainya jam 08:30
        currentTime = slotEndTime;
    }

    // periksa lagi, ada slot yg kebentuk ga?
    if(slotToCreate.length === 0) {
        throw new Error("Gagal membuat slot. Rentang waktu terlalu pendek.");
    }

    // 4. simpan ke database (transaction)
    // Kita pake transaction biar AMAN.
    // Kalau simpan Slot gagal, maka Schedule juga batal disimpen.
    const result = await prisma.$transaction(async (tx) => {
        // a. simpan header jadwal dulu
        const newSchedule = await tx.availability_schedules.create({
            data : {
                dosen_user_id: dosenUserId,
                type: 'ad_hoc',
                slot_duration_minutes: durationMinutes,
                start_time: startTime.toDate(),
                end_time: endTime.toDate(),
                // effective_date bisa kita isi tanggal hari itu
                effective_start_date: startTime.toDate(),
                effective_end_date: endTime.toDate()
            }
        })

        // b. simpan slot slotnya denghan bulk insert
        // Kita perlu nambahin 'schedule_id' ke setiap objek slot yang tadi kita bikin
        const slotWithRelation = slotToCreate.map(slot => ({
            ...slot,
            schedule_id: newSchedule.schedule_id.toString()
        }))

        await tx.slots.createMany({
            data : slotWithRelation
        })

        return {
            schedule_id: newSchedule.schedule_id.toString(),
            ...newSchedule
        }
    })

    return {
        schedule: result,
        total_slot: slotToCreate.length
    }

}
