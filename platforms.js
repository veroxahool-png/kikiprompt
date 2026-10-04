/* Profil platform kikiprompt.
   Ubah atau tambahkan profil di sini tanpa menyentuh app.js.
   - aspects     : daftar rasio aspek yang ditawarkan (null = daftar umum)
   - maxSeconds  : batas durasi per video (0 = tidak diperiksa)
   - refTemplate : cara merujuk gambar model, {n} diganti nomor model (kosong = tidak dipakai) */
window.KIKIPROMPT_PLATFORMS = [
  {
    id: 'generic',
    name: 'Umum (semua platform)',
    note: 'Format netral yang dapat dipakai di aplikasi video AI mana pun.',
    aspects: null,
    maxSeconds: 0,
    refTemplate: ''
  },
  {
    id: 'dola-seedance',
    name: 'Dola AI — Seedance 2.0 fast',
    note: 'Nilai awal profil ini berupa perkiraan. Sesuaikan batas durasi dan cara rujukan gambar dengan ketentuan di aplikasi.',
    aspects: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    maxSeconds: 15,
    refTemplate: '@image{n}'
  }
];
