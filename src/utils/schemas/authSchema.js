import {z} from 'zod';

export const loginSchema = z.object({
    body : z.object({
        identity_number : z.string({required_error: "nim/nidn wajib di isi"}),
        password: z.string({required_error: "password wajib di isi"})
    })
})