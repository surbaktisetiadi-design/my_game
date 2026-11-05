/**
 * Family 100 V5 - Bank Soal & History CSV Backup Manager
 */
document.addEventListener('DOMContentLoaded', () => {
  const btnExportQuestionsJSON = document.getElementById('btnExportQuestionsJSON');
  const fileImportQuestionsJSON = document.getElementById('fileImportQuestionsJSON');
  const btnExportCSV = document.getElementById('btnExportCSV');

  if (btnExportQuestionsJSON) {
    btnExportQuestionsJSON.addEventListener('click', () => {
      const questions = DB.getQuestions();
      if (questions.length === 0) {
        alert('Bank soal masih kosong!');
        return;
      }

      const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Family100-BankSoal-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (fileImportQuestionsJSON) {
    fileImportQuestionsJSON.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedQuestions = JSON.parse(event.target.result);
          if (Array.isArray(importedQuestions)) {
            DB.saveQuestions(importedQuestions);
            alert(`Berhasil mengimpor ${importedQuestions.length} pertanyaan survei ke Bank Soal!`);
            location.reload();
          } else {
            alert('Format berkas JSON Bank Soal tidak valid (harus berupa array data soal)!');
          }
        } catch (err) {
          alert('Gagal membaca berkas JSON!');
        }
      };
      reader.readAsText(file);
    });
  }

  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => {
      const history = DB.getHistory();
      if (history.length === 0) {
        alert('Belum ada riwayat pertandingan untuk diekspor!');
        return;
      }

      let csv = 'Waktu,Nama Sesi,Sekolah,Tim 1,Skor Tim 1,Tim 2,Skor Tim 2,Pemenang\n';
      history.forEach(h => {
        const teamA = h.teams ? h.teams.A : { name: 'TIM A', totalScore: 0 };
        const teamB = h.teams ? h.teams.B : { name: 'TIM B', totalScore: 0 };
        let winner = teamA.totalScore > teamB.totalScore ? teamA.name : (teamB.totalScore > teamA.totalScore ? teamB.name : 'SERI');
        csv += `"${h.timestamp}","${h.name}","${h.school}","${teamA.name}",${teamA.totalScore},"${teamB.name}",${teamB.totalScore},"${winner}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rekap-Family100-Sesi-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
});
