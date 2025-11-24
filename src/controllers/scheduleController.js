import prisma from '../utils/prisma.js'
import {createAdhocSchedule, createBlokSchedule} from'../services/scheduleService.js'

export const createSchedule = async (req, res, next) => {
    try {
        const {type} = req.body

        const dosenUserId = BigInt(req.user.userId);

        

        let result;
        if (type === 'ad_hoc') {
            result = await createAdhocSchedule(dosenUserId, req.body)
        } else if (type === 'blok') {
            result = await createBlokSchedule(dosenUserId, req.body)
        }

        return res.status(201).json({
            status : 'success',
            message : "Berhasil membuat jadwal",
            data : result
        })


    } catch (error) {
        next(error)
    }
}