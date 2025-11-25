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
            ],   
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

// {
//   "type": "blok",
//   "effective_start_date": "2025-12-01",
//   "effective_end_date": "2025-12-05",
//   "start_jam": "09:00",
//   "end_jam": "12:00",
//   "slot_duration": 30
// }


export const createBlokSchedule = async (dosenUserId, data) => {
    // const startTIme = dayjs(data.start_time);
    // const endTime = dayjs(data.end_time);
    const durationMinutes = data.slot_duration || 30;
    const startDate = dayjs(data.effective_start_date);
    const endDate = dayjs(data.effective_end_date);

    const slotToCreate = []

    let currentDay = startDate;

    while (currentDay.isSameOrBefore(endDate, 'day')){
        const [startHour, startMinute] = data.start_time.split(':').map(Number)
        const [endHour, endMinute] = data.end_time.split(':').map(Number)

        const dailyStartTime = currentDay
                                .hour(startHour)
                                .minute(startMinute)
                                .second(0)
                                .millisecond(0)
        const dailyEndTime = currentDay
                                .hour(endHour)
                                .minute(endMinute)
                                .second(0)
                                .millisecond(0)


        const conflict = await prisma.availability_schedules.findFirst({
            where : {
                dosen_user_id : dosenUserId,
                AND : [
                    {start_time : {lt: dailyEndTime.toDate()}},
                    {end_time : {gt : dailyStartTime.toDate()}}
                ]
            }
        })

        if (conflict) {
            const conflictDate = dayjs(dailyStartTime).format("DD MMM YYYY");
            const conflictStart = dayjs(conflict.start_time).format("HH:mm");
            const conflictEnd = dayjs(conflict.end_time).format("HH:mm");

            throw new Error(
                `Jadwal Blok Gagal: Pada tanggal ${conflictDate}, sudah ada jadwal lain (${conflictStart} - ${conflictEnd}).`
            );
        }

        let currentTime = dailyStartTime;
        while(currentTime.add(durationMinutes,'minute').isSameOrBefore(dailyEndTime)){
            const slotEndTime = currentTime.add(durationMinutes, 'minute')

            slotToCreate.push({
                dosen_user_id: dosenUserId,
                start_time: currentTime.toDate(),
                end_time: slotEndTime.toDate(),
                status: 'available'
            })

            currentTime = slotEndTime
        }

        currentDay = currentDay.add(1, 'day')
    }

    const result = await prisma.$transaction(async (tx) => {
        const newSchedule = await tx.availability_schedules.create({
            data : {
                dosen_user_id : dosenUserId,
                type : 'blok',
                slot_duration_minutes: durationMinutes,
                // Untuk blok, start_time/end_time di header bisa kita isi 
                // gabungan tanggal awal + jam awal
                start_time: dayjs(`${data.effective_start_date}T${data.start_time}`).toDate(),
                end_time: dayjs(`${data.effective_end_date}T${data.end_time}`).toDate(),

                effective_start_date: startDate.toDate(),
                effective_end_date: endDate.toDate()
            }
        })

        const slotWithRelation = slotToCreate.map(slot => ({
            ...slot,
            schedule_id: newSchedule.schedule_id
        }))

        await tx.slots.createMany({data : slotWithRelation})
        return newSchedule
    })

    return { schedule: result, total_slots: slotToCreate.length };
}

// {
//   "type": "rutin",
//   "day_of_week": 1,
//   "start_jam": "13:00",
//   "end_jam": "15:00",
//   "effective_start_date": "2025-09-01",
//   "effective_end_date": "2025-12-31",
//   "slot_duration": 30
// }

export const createRoutineSchedule = async (dosenUserId, data) => {
    const startDate = dayjs(data.effective_start_date);
    const endDate = dayjs(data.effective_end_date);
    const durationMinutes = data.slot_duration || 30;

    const slotToCreate = [];

    // kalo tanggal mulai dan hari belom sesuai, geser tanggal sampe ketemu harinya
    let currentDay = startDate;
    while (currentDay.day() !== data.day_of_week) {
        currentDay = currentDay.add(1, 'day')
    } // jika perulangan sudah berakhir maka hari dan tanggal sudah sesuai

    // memisahkan data waktu menjadi jam dan menit
    const [startHour, startMinute] = data.start_time.split(':').map(Number)
    const [endHour, endMinute] = data.start_time.split(':').map(Number)

    while (currentDay.isSameOrBefore(endDate, 'day')){
        // mendefinisikan waktu mulai dan akhir pada tiap tanggal
        const routineStartTime = currentDay.hour(startHour).minute(startMinute).second(0).millisecond(0);
        const routineEndTime = currentDay.hour(endHour).minute(endMinute).second(0).millisecond(0);

        // cek konflik. apakah ada,
        // 1. jadwal di hari ini yg waktu mulainya kurang dari waktu akhir di jadwal lain?
        // 2. jadwal di hari ini yg  waktu akhirnya lebih dari waktu mulai di jadwal lain?
        const conflict = await prisma.availability_schedules.findFirst({
            where : {
                dosen_user_id: dosenUserId,
                AND : [
                    {start_time : {lt : routineEndTime.toDate()}},
                    {end_time: {gt : routineStartTime.toDate()}}
                ]
            }
        });

        if (conflict) {
            const conflictDate = dayjs(routineStartTime).format("DD MMM YYYY"); 
            const conflictStart = dayjs(conflict.start_time).format("HH:mm");
            const conflictEnd = dayjs(conflict.end_time).format("HH:mm");

            throw new Error(
                `Jadwal Rutin Gagal: Pada tanggal ${conflictDate}, sudah ada jadwal lain (${conflictStart} - ${conflictEnd}).`
            );
        };

        // generate slot harian
        let currentTime = routineStartTime;
        // asumsikan jam saat ini 8.00
        // apakh jam saat ini ditambah durasi bimbingan dalam menit sama dengan kurang dari waktu akhir
        while (currentTime.add(durationMinutes, 'minute').isSameOrBefore(routineEndTime)){
            // waktu akhir dari slot = waktu saat ini di tambah menit durasi
            const slotEndTime = currentTime.add(durationMinutes, 'minute')

            slotToCreate.push({
                dosen_user_id : dosenUserId,
                start_time: currentTime.toDate(),
                end_time: slotEndTime.toDate(),
                status: 'available'
            });

            // jam geser
            currentTime = slotEndTime;
        }

        currentDay = currentDay.add(7, 'day')
    }

    const result = await prisma.$transaction(async (tx) => {
        // buat header schedule
        const newSchedule = await tx.availability_schedules.create({
            data : {
                dosen_user_id: dosenUserId,
                type : "rutin",
                day_of_week : data.day_of_week,
                slot_duration_minutes : durationMinutes,

                // tanggal nya hanya merupakan dummy, karena db hanya menyimpan data jamnya
                rutin_start_time: dayjs(`1999-10-01T${data.start_time}`).toDate(),
                rutin_end_time: dayjs(`1999-10-01T${data.end_time}`).toDate(),

                effective_start_date: startDate.toDate(),
                effective_end_date: endDate.toDate()
            }
        });

        const slotWithRelation = slotToCreate.map(slot => ({
            ...slot,
            schedule_id: newSchedule.schedule_id
        }))

        await tx.slots.createMany({
            data : slotWithRelation
        })
        return newSchedule
    })

    return {schedule : result, total_slot: slotToCreate.length}

}