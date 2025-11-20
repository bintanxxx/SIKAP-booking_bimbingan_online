// const express = require('express');
// const cors = require('cors');


import express from "express";
import cors from 'cors'
const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

// --- DATABASE TERPISAH ---
const USERS_DB = [
    // Mahasiswa
    { identity_number: "2023081001", nama: "Fajar Nugraha", role: "MHS", email: "fajar@student.univ.ac.id" },
    { identity_number: "2023081002", nama: "Anisa Rahmawati", role: "MHS", email: "anisa@student.univ.ac.id" },
    { identity_number: "2023081003", nama: "Bintang Adji Pratama", role : "MHS", email: "bintang@student.univ.ac.id"},
    // Dosen
    { identity_number: "0411028801", nama: "Dr. Budi Santoso", role: "DSN", email: "budi@univ.ac.id" },
    { identity_number: "0415059002", nama: "Siti Aminah, M.T.", role: "DSN", email: "siti@univ.ac.id" }
];

const MAPPING_DB = [
    { nim: "2023081001", nidn_pa: "0411028801" }, // Fajar -> Dr. Budi
    { nim: "2023081002", nidn_pa: "0415059002" },  // Anisa -> Siti Aminah
    { nim: "2023081003", nidn_pa: "0411028801" }, // Bintang -> Dr. Budi
];

// 1. ENDPOINT LOGIN (Auth Only)
app.post('/api/v1/auth/login', (req, res) => {
    const { identity_number, password } = req.body;
    if (password !== "123456") return res.status(401).json({ meta: { message: "Wrong Password" } });
    
    const user = USERS_DB.find(u => u.identity_number === identity_number);
    if (!user) return res.status(404).json({ meta: { message: "User Not Found" } });

    res.json({
        meta: { code: 200, status: "success" },
        data: { user: user, token: "fake-jwt" }
    });
});

// 2. ENDPOINT CEK PA (Akademik)
app.get('/api/v1/akademik/pa/:nim', (req, res) => {
    const mapping = MAPPING_DB.find(m => m.nim === req.params.nim);
    if (!mapping) return res.status(404).json({ meta: { message: "Belum ada PA" } });
    
    res.json({ meta: { code: 200 }, data: { nidn_pa: mapping.nidn_pa } });
});

// 3. ENDPOINT DETAIL DOSEN (SDM) - Buat narik data dosen kalo belum ada
app.get('/api/v1/sdm/dosen/:nidn', (req, res) => {
    const dosen = USERS_DB.find(u => u.identity_number === req.params.nidn && u.role === "DSN");
    if (!dosen) return res.status(404).json({ meta: { message: "Dosen Not Found" } });

    res.json({ meta: { code: 200 }, data: dosen });
});

app.listen(PORT, () => console.log(`🚀 Mock Server separated on port ${PORT}`));