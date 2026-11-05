# my_game
# Family 100 V5 – School Quiz Edition 🎓🏆

Aplikasi Kuis **Family 100 V5** berbasis web offline untuk Chromebook & Proyektor Sekolah.

## 🌟 Fitur & Perbaikan Terkini (V5.4):
1. **Otomatisasi Durasi Timer Bawaan Setiap Babak & Giliran**:
   * Timer **otomatis di-reset kembali ke Durasi Timer Bawaan** (misal 15s/20s/25s) setiap kali:
     - Berpindah ke Ronde Baru.
     - Berpindah giliran di Duel Pembuka.
     - Berpindah ke Fase Main Utama / Lempar.
     - Berpindah ke Fase Steal.
     - Menekan tombol `▶ Start` saat timer sebelumnya sudah 0 detik.
2. **Fitur Auto-Strike Toggle Switch (Sakelar Real-Time)**:
   * Dilengkapi opsi sakelar `[x] Auto-Strike jika Timer 0s` pada Layar Operator.
   * Jika aktif, saat timer menyentuh angka `0`, sistem membunyikan buzzer dan **secara otomatis menambahkan 1 Strike (❌)**.
   * Jika tidak dicentang, sistem hanya memperdengarkan suara penanda tanpa menambah Strike otomatis.
3. **Restrukturisasi Dashboard (Bank Soal & Rekap Sesi)**:
   * Kelola Bank Soal (Tambah/Edit Soal, Ekspor Soal JSON, Impor Soal JSON).
   * Tombol **📊 Ekspor Riwayat Sesi (CSV)** berada di header tabel Rekap Riwayat Sesi.
4. **Nama Tim Dinamis**:
   * Seluruh tombol (Duel, Main, Steal, Winner) secara dinamis menampilkan nama tim aktual.
