import axios from "axios";
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_MOCK_URL = "http://localhost:4001/api/v1";

export const loginAndSync = async (identityNumber, password) => {
    try {
        // --- STEP 1: LOGIN ---
        const loginRes = await axios.post(`${BASE_MOCK_URL}/auth/login`, { 
            identity_number: identityNumber, password 
        });
        const ssoUser = loginRes.data.data.user;

        // --- STEP 2: UPSERT USER YG LOGIN ---
        let appRole = ssoUser.role === 'DSN' ? 'dosen' : 'mahasiswa';
        
        const localUser = await prisma.users.upsert({
            where: { external_id: ssoUser.identity_number },
            update: { name: ssoUser.nama, email: ssoUser.email },
            create: { 
                external_id: ssoUser.identity_number, 
                name: ssoUser.nama, 
                email: ssoUser.email, 
                role: appRole 
            }
        });

        // --- STEP 3: LOGIKA AUTO-MAPPING (Khusus Mahasiswa) ---
        if (appRole === 'mahasiswa') {
            try {
                // A. Tanya API Akademik: Siapa PA-nya?
                const paRes = await axios.get(`${BASE_MOCK_URL}/akademik/pa/${ssoUser.identity_number}`);
                const nidnPA = paRes.data.data.nidn_pa;

                if (nidnPA) {
                    // B. Cek Dosennya udah ada di DB Lokal belum?
                    let dosenPA = await prisma.users.findUnique({ 
                        where: { external_id: nidnPA } 
                    });

                    // C. Kalo Dosen Belum Ada -> TARIK DATA DARI API SDM (Auto-Create Dosen)
                    if (!dosenPA) {
                        console.log(`Dosen PA ${nidnPA} belum ada di lokal. Menarik data dari API SDM...`);
                        const dosenRes = await axios.get(`${BASE_MOCK_URL}/sdm/dosen/${nidnPA}`);
                        const dataDosen = dosenRes.data.data;

                        dosenPA = await prisma.users.create({
                            data: {
                                external_id: dataDosen.identity_number,
                                name: dataDosen.nama,
                                email: dataDosen.email,
                                role: 'dosen'
                            }
                        });
                    }

                    // D. Simpan Mapping ke DB
                    await prisma.mapping_pa.upsert({
                        where: { mahasiswa_user_id: localUser.user_id },
                        update: { dosen_pa_user_id: dosenPA.user_id },
                        create: {
                            mahasiswa_user_id: localUser.user_id,
                            dosen_pa_user_id: dosenPA.user_id,
                            is_override: false
                        }
                    });
                    console.log("✅ Auto-Mapping Berhasil!");
                }

            } catch (err) {
                // Kalo error di step mapping (misal API PA 404), jangan gagalin loginnya.
                // User tetep boleh masuk, cuma mappingnya kosong.
                console.warn("⚠️ Gagal Auto-Mapping (Mungkin belum di-set di Akademik):", err.message);
            }
        }

        // --- STEP 4: GENERATE TOKEN ---
        const token = jwt.sign(
            { userId: localUser.user_id.toString(), role: localUser.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        return { user: localUser, token };

    } catch (error) {
        if (error.response) {
            const err = new Error(error.response.data.meta?.message || "Login Error");
            err.statusCode = error.response.status;
            throw err;
        }
        throw error;
    }
}