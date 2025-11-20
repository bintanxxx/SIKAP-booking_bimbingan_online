import { email } from 'zod'
import {loginAndSync} from '../services/authService.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const login = async (req, res, next) => {
    try {
        const {identity_number, password} = req.body

        // panggil service
        const result = await loginAndSync(identity_number, password)

        // kirim response
        const userSafe = {
            ...result.user,
            user_id : result.user.user_id.toString()
        }

        res.status(200).json({
            status: 'success',
            message: 'Login Berhasil!',
            data: {
                user: userSafe,
                token: result.token
            }
        });

    } catch (error) {
        next(error)
    }
}

export const getMe = async (req, res, next) => {
    try {
        const currentUserId = req.user.userId;

        const userDetail = await prisma.users.findUnique({
            where : {user_id: currentUserId},
            include : {
                mapping_sebagai_mhs : {
                    include : {dosen_pa_user: true}
                },
                mapping_sebagai_pa : {
                    include : {mahasiswa_user : true}
                }
            }
        })

        if(!userDetail) return res.status(404).json({status: 'fail', message: "User tidak dapat ditemukan."})

        // flattening data

        // a. cek dosen pa jika mahasiswa 
        let dosenPA = null;
        if (userDetail.mapping_sebagai_mhs) {
            const d = userDetail.mapping_sebagai_mhs.dosen_pa_user
            dosenPA = {
                user_id: d.user_id.toString(),
                nidn: d.external_id,
                name: d.name,
                email: d.email,
            }
        }

        // b. cek list bimbingan
        let listBimbingan = []
        let totalBimbingan = 0

        if (userDetail.mapping_sebagai_pa && userDetail.mapping_sebagai_pa.length > 0) {
            listBimbingan = userDetail.mapping_sebagai_pa.map(m => ({
                user_id : m.mahasiswa_user.user_id.toString(),
                nim: m.mahasiswa_user.external_id,
                name: m.mahasiswa_user.name,
                email : m.mahasiswa_user.email
            }))
        }

        const userSafe = {
            user_id : userDetail.user_id.toString(),
            nim_nidn : userDetail.external_id,
            name: userDetail.name,
            email : userDetail.email,
            role: userDetail.role,

            dosen_pa : dosenPA,
            mahasiswa_bimbingan : {
                total : listBimbingan.length,
                list: listBimbingan
            }
        }

        res.status(200).json({
            status : 'success',
            data : {user : userSafe}
        })
    } catch (error) {
        next(error)
    }
}