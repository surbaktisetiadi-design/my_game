/**
 * Family 100 V5 - Home & Dashboard Logic (Render History & Winners Table)
 */
document.addEventListener('DOMContentLoaded', () => {
  loadSchoolProfile();
  loadStats();
  renderSessionHistoryTable();

  const formSchool = document.getElementById('formSchool');
  if (formSchool) {
    formSchool.addEventListener('submit', (e) => {
      e.preventDefault();
      const school = DB.getSchool();
      school.name = document.getElementById('inputSchoolName').value;
      school.eventName = document.getElementById('inputEventName').value;
      DB.saveSchool(school);

      const teams = DB.getTeams();
      teams.teamA.name = document.getElementById('inputTeamA').value;
      teams.teamB.name = document.getElementById('inputTeamB').value;
      DB.saveTeams(teams);

      alert('Identitas Sekolah & Tim berhasil disimpan!');
      loadSchoolProfile();
      loadStats();
    });
  }

  const btnQuickQuestionModal = document.getElementById('btnQuickQuestionModal');
  if (btnQuickQuestionModal) {
    btnQuickQuestionModal.addEventListener('click', () => {
      renderQuestionsTable();
      document.getElementById('modalBankSoal').classList.add('active');
    });
  }

  const btnAddQuestion = document.getElementById('btnAddQuestion');
  if (btnAddQuestion) {
    btnAddQuestion.addEventListener('click', () => {
      openQuestionFormModal(null);
    });
  }

  const btnAddAnswerRow = document.getElementById('btnAddAnswerRow');
  if (btnAddAnswerRow) {
    btnAddAnswerRow.addEventListener('click', () => {
      addAnswerRowInput('', '', '');
    });
  }

  const formQuestionEdit = document.getElementById('formQuestionEdit');
  if (formQuestionEdit) {
    formQuestionEdit.addEventListener('submit', handleSaveQuestionForm);
  }

  const btnClearAllHistory = document.getElementById('btnClearAllHistory');
  if (btnClearAllHistory) {
    btnClearAllHistory.addEventListener('click', () => {
      if (confirm('Apakah Anda yakin ingin menghapus SELURUH riwayat pertandingan?')) {
        DB.clearAllHistory();
        renderSessionHistoryTable();
        loadStats();
      }
    });
  }
});

function loadSchoolProfile() {
  const school = DB.getSchool();
  const teams = DB.getTeams();

  document.getElementById('dispSchoolName').textContent = school.name;
  document.getElementById('dispEventName').textContent = school.eventName;

  document.getElementById('inputSchoolName').value = school.name;
  document.getElementById('inputEventName').value = school.eventName;

  document.getElementById('inputTeamA').value = teams.teamA.name || 'TIM A';
  document.getElementById('inputTeamB').value = teams.teamB.name || 'TIM B';
}

function loadStats() {
  const questions = DB.getQuestions();
  const teams = DB.getTeams();
  const history = DB.getHistory();

  document.getElementById('statQuestions').textContent = questions.length;
  document.getElementById('statTeamNames').textContent = `${teams.teamA.name || 'Tim A'} vs ${teams.teamB.name || 'Tim B'}`;
  document.getElementById('statHistory').textContent = history.length;
}

function renderSessionHistoryTable() {
  const tbody = document.querySelector('#tableSessionHistory tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const history = DB.getHistory();

  if (history.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 25px;">
          Belum ada riwayat pertandingan tersimpan. Selesaikan kuis di <strong>Layar Operator</strong> untuk mencatat skor pemenang!
        </td>
      </tr>
    `;
    return;
  }

  history.forEach((h, index) => {
    const teamA = h.teams ? h.teams.A : { name: 'TIM A', totalScore: 0 };
    const teamB = h.teams ? h.teams.B : { name: 'TIM B', totalScore: 0 };
    
    const scoreA = teamA.totalScore || 0;
    const scoreB = teamB.totalScore || 0;

    let winnerBadge = '';
    if (scoreA > scoreB) {
      winnerBadge = `<span class="status-badge badge-gold">🏆 ${teamA.name}</span>`;
    } else if (scoreB > scoreA) {
      winnerBadge = `<span class="status-badge badge-gold">🏆 ${teamB.name}</span>`;
    } else {
      winnerBadge = `<span class="status-badge badge-orange">🤝 SERI / IMBANG</span>`;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div style="font-weight: 700; color: #FFF;">${h.name || 'Sesi Kuis'}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${h.timestamp || '-'}</div>
      </td>
      <td><span class="status-badge badge-blue">${h.school || 'Sekolah'}</span></td>
      <td>
        <span style="color: #60A5FA; font-weight: 700;">${teamA.name}</span> 
        <span style="color: var(--text-muted); font-size: 12px;"> vs </span> 
        <span style="color: #2DD4BF; font-weight: 700;">${teamB.name}</span>
      </td>
      <td style="text-align: center; font-size: 16px; font-weight: 800;">
        <span style="color: #60A5FA;">${scoreA}</span> : <span style="color: #2DD4BF;">${scoreB}</span>
      </td>
      <td>${winnerBadge}</td>
      <td style="text-align: center;">
        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deleteHistoryRecord(${index})">🗑️ Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteHistoryRecord(index) {
  if (confirm('Apakah Anda yakin ingin menghapus riwayat pertandingan ini?')) {
    DB.deleteHistoryRecord(index);
    renderSessionHistoryTable();
    loadStats();
  }
}

function renderQuestionsTable() {
  const tbody = document.querySelector('#tableQuestions tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const questions = DB.getQuestions();

  const labelCount = document.getElementById('modalQuestionCountLabel');
  if (labelCount) labelCount.textContent = `Total Soal: ${questions.length}`;

  if (questions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 20px;">Belum ada soal. Klik "+ Tambah Pertanyaan Baru" di bawah.</td></tr>';
    return;
  }

  questions.forEach((q) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="status-badge badge-blue">${q.category || 'Umum'}</span></td>
      <td><strong>${q.question}</strong></td>
      <td><span class="status-badge badge-teal">${q.answers.length} Jawaban</span></td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-outline" style="padding: 4px 10px; font-size: 12px;" onclick="editQuestion('${q.id}')">✏️ Edit</button>
          <button class="btn btn-danger" style="padding: 4px 10px; font-size: 12px;" onclick="deleteQuestion('${q.id}')">🗑️ Hapus</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openQuestionFormModal(qId = null) {
  const modal = document.getElementById('modalFormQuestion');
  const title = document.getElementById('formQuestionModalTitle');
  const container = document.getElementById('containerAnswersRows');
  
  container.innerHTML = '';

  if (qId) {
    const questions = DB.getQuestions();
    const q = questions.find(item => item.id === qId);
    if (!q) return;

    title.textContent = 'Edit Pertanyaan Survei';
    document.getElementById('editQuestionId').value = q.id;
    document.getElementById('inputQText').value = q.question;
    document.getElementById('inputQCategory').value = q.category || 'Sekolah';

    q.answers.forEach((ans, idx) => {
      addAnswerRowInput(ans.text, ans.points, ans.rank || (idx + 1));
    });
  } else {
    title.textContent = 'Tambah Pertanyaan Survei Baru';
    document.getElementById('editQuestionId').value = '';
    document.getElementById('inputQText').value = '';
    document.getElementById('inputQCategory').value = 'Sekolah';

    for (let i = 1; i <= 5; i++) {
      addAnswerRowInput('', '', i);
    }
  }

  modal.classList.add('active');
}

function addAnswerRowInput(textVal = '', pointsVal = '', rankVal = '') {
  const container = document.getElementById('containerAnswersRows');
  const rowCount = container.children.length + 1;
  if (rowCount > 8) {
    alert('Maksimal 8 jawaban per pertanyaan!');
    return;
  }

  const currentRank = rankVal || rowCount;
  const div = document.createElement('div');
  div.className = 'answer-input-row';
  div.style.cssText = 'display: grid; grid-template-columns: 50px 1fr 90px 40px; gap: 8px; align-items: center;';
  
  div.innerHTML = `
    <div>
      <input type="number" class="form-control input-ans-rank" value="${currentRank}" min="1" max="8" style="padding: 6px; text-align: center;" required title="Peringkat (1=Top Survey)">
    </div>
    <div>
      <input type="text" class="form-control input-ans-text" value="${textVal}" placeholder="Jawaban Survei ke-${rowCount}" style="padding: 6px 10px;" required>
    </div>
    <div>
      <input type="number" class="form-control input-ans-points" value="${pointsVal}" placeholder="Poin" min="1" max="100" style="padding: 6px 10px;" required>
    </div>
    <div>
      <button type="button" class="btn btn-danger" style="padding: 6px; width: 100%;" onclick="this.closest('.answer-input-row').remove()">✕</button>
    </div>
  `;

  container.appendChild(div);
}

function handleSaveQuestionForm(e) {
  e.preventDefault();

  const editId = document.getElementById('editQuestionId').value;
  const qText = document.getElementById('inputQText').value.trim();
  const qCategory = document.getElementById('inputQCategory').value.trim() || 'Sekolah';

  const rows = document.querySelectorAll('.answer-input-row');
  if (rows.length === 0) {
    alert('Masukkan minimal 1 jawaban survei!');
    return;
  }

  const answers = [];
  rows.forEach((row) => {
    const text = row.querySelector('.input-ans-text').value.trim();
    const points = parseInt(row.querySelector('.input-ans-points').value) || 0;
    const rank = parseInt(row.querySelector('.input-ans-rank').value) || (answers.length + 1);

    if (text && points > 0) {
      answers.push({ text: text, points: points, rank: rank });
    }
  });

  if (answers.length < 2) {
    alert('Masukkan minimal 2 jawaban survei yang valid (teks & poin > 0)!');
    return;
  }

  answers.sort((a, b) => a.rank - b.rank);

  let questions = DB.getQuestions();

  if (editId) {
    const idx = questions.findIndex(q => q.id === editId);
    if (idx !== -1) {
      questions[idx] = {
        id: editId,
        category: qCategory,
        question: qText,
        answers: answers
      };
    }
  } else {
    const newQ = {
      id: 'q_' + Date.now(),
      category: qCategory,
      question: qText,
      answers: answers
    };
    questions.push(newQ);
  }

  DB.saveQuestions(questions);
  document.getElementById('modalFormQuestion').classList.remove('active');
  
  renderQuestionsTable();
  loadStats();
  alert('Pertanyaan survei berhasil disimpan!');
}

function editQuestion(id) { openQuestionFormModal(id); }

function deleteQuestion(id) {
  if (confirm('Apakah Anda yakin ingin menghapus pertanyaan survei ini?')) {
    let questions = DB.getQuestions().filter(q => q.id !== id);
    DB.saveQuestions(questions);
    renderQuestionsTable();
    loadStats();
  }
}
