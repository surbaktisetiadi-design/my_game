/**
 * Family 100 V5 - Operator Interface Logic
 * Features:
 * - Dynamic Team Names across ALL controls (Duel, Main, Steal, Winner)
 * - Auto-Pause Timer when Clicking Answers or Adding Strikes
 * - Auto-Reset Timer to Default Session Duration on Start / Reset / New Turn / Round Switch
 * - Sakelar Auto-Strike Toggle Switch (0s trigger)
 * - Category Filter & Question Checkbox Selector
 * - Synchronized Timer Control using Default Session Duration
 * - Auto-STEAL (Option B) & Reset Pot to 0
 */
let timerInterval = null;
let currentTimerVal = 15;

document.addEventListener('DOMContentLoaded', () => {
  initOperator();

  window.addEventListener('storage', (e) => {
    if (e.key === 'f100_active_session') {
      renderOperatorState();
    }
  });

  if (window.BroadcastChannel) {
    try {
      const bc = new BroadcastChannel('f100_channel');
      bc.onmessage = (e) => {
        if (e.data && e.data.type === 'SESSION_UPDATE') {
          renderOperatorState();
        }
      };
    } catch(e) {}
  }
});

function initOperator() {
  const session = DB.getActiveSession();
  const settings = DB.getSettings();

  loadCategoryDropdownAndQuestionSelector();

  if (!session) {
    document.getElementById('setupSessionArea').style.display = 'block';
    document.getElementById('activeGameArea').style.display = 'none';
  } else {
    document.getElementById('setupSessionArea').style.display = 'none';
    document.getElementById('activeGameArea').style.display = 'grid';
    renderOperatorState();
  }

  document.getElementById('btnStartNewSession').addEventListener('click', startNewSession);
  document.getElementById('btnPickTeamA').addEventListener('click', () => pickFirstTeam('A'));
  document.getElementById('btnPickTeamB').addEventListener('click', () => pickFirstTeam('B'));
  document.getElementById('btnChoiceMain').addEventListener('click', () => makeMainChoice('MAIN'));
  document.getElementById('btnChoiceLempar').addEventListener('click', () => makeMainChoice('LEMPAR'));
  document.getElementById('btnAddStrikeOp').addEventListener('click', addStrikeOp);
  document.getElementById('btnStealWrong').addEventListener('click', () => handleStealOp(false, null));
  document.getElementById('btnStrikeDuplicate').addEventListener('click', handleDuplicateStrike);
  document.getElementById('btnNextRound').addEventListener('click', handleNextRound);
  document.getElementById('btnEndSession').addEventListener('click', handleEndSession);

  const btnResetAndNew = document.getElementById('btnResetAndNewSession');
  if (btnResetAndNew) {
    btnResetAndNew.addEventListener('click', resetAndCreateNewSession);
  }

  document.getElementById('btnStartTimer').addEventListener('click', startTimer);
  document.getElementById('btnStopTimer').addEventListener('click', stopTimer);
  document.getElementById('btnResetTimer').addEventListener('click', resetTimer);

  const chkAutoStrike = document.getElementById('chkAutoStrikeToggle');
  if (chkAutoStrike) {
    chkAutoStrike.checked = settings.autoStrikeEnabled || false;
    chkAutoStrike.addEventListener('change', (e) => {
      const currentSettings = DB.getSettings();
      currentSettings.autoStrikeEnabled = e.target.checked;
      DB.saveSettings(currentSettings);
    });
  }

  document.getElementById('selectCategoryFilter').addEventListener('change', renderQuestionSelectorTable);
  document.getElementById('btnSelectAllQuestions').addEventListener('click', () => toggleAllQuestions(true));
  document.getElementById('btnUnselectAllQuestions').addEventListener('click', () => toggleAllQuestions(false));
}

function loadCategoryDropdownAndQuestionSelector() {
  const questions = DB.getQuestions();
  const selectCat = document.getElementById('selectCategoryFilter');
  if (!selectCat) return;

  const categories = Array.from(new Set(questions.map(q => q.category || 'Sekolah')));
  
  selectCat.innerHTML = '<option value="ALL">-- Semua Kategori --</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    selectCat.appendChild(opt);
  });

  renderQuestionSelectorTable();
}

function renderQuestionSelectorTable() {
  const questions = DB.getQuestions();
  const catFilter = document.getElementById('selectCategoryFilter').value;
  const tbody = document.querySelector('#tableQuestionSelector tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const filtered = (catFilter === 'ALL') ? questions : questions.filter(q => (q.category || 'Sekolah') === catFilter);

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 15px;">Tidak ada pertanyaan untuk kategori ini.</td></tr>';
    updateSelectedRoundsLabel();
    return;
  }

  filtered.forEach(q => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="chk-select-q" value="${q.id}" checked style="width: 18px; height: 18px; cursor: pointer;">
      </td>
      <td><span class="status-badge badge-blue">${q.category || 'Sekolah'}</span></td>
      <td><strong>${q.question}</strong></td>
      <td style="text-align: center;"><span class="status-badge badge-teal">${q.answers ? q.answers.length : 0} Jawaban</span></td>
    `;
    
    tr.querySelector('.chk-select-q').addEventListener('change', updateSelectedRoundsLabel);
    tbody.appendChild(tr);
  });

  updateSelectedRoundsLabel();
}

function toggleAllQuestions(check) {
  const chks = document.querySelectorAll('.chk-select-q');
  chks.forEach(c => c.checked = check);
  updateSelectedRoundsLabel();
}

function updateSelectedRoundsLabel() {
  const selectedChks = document.querySelectorAll('.chk-select-q:checked');
  const count = selectedChks.length;
  const label = document.getElementById('labelSelectedRoundsCount');
  if (label) {
    label.textContent = `Total Soal Terpilih: ${count} Soal (${count} Ronde)`;
  }
}

function startNewSession() {
  const sessionName = document.getElementById('inputSessionName').value || 'Sesi Kuis';
  const defaultTimer = parseInt(document.getElementById('inputDefaultTimerSec').value) || 15;
  const selectedChks = document.querySelectorAll('.chk-select-q:checked');
  
  if (selectedChks.length === 0) {
    alert('Pilih/centang minimal 1 pertanyaan survei untuk dimainkan!');
    return;
  }

  const selectedQuestionIds = Array.from(selectedChks).map(c => c.value);
  GameEngine.createNewSession(sessionName, selectedQuestionIds, defaultTimer);
  
  document.getElementById('setupSessionArea').style.display = 'none';
  document.getElementById('activeGameArea').style.display = 'grid';
  renderOperatorState();
}

function renderOperatorState() {
  const session = DB.getActiveSession();
  if (!session) {
    document.getElementById('setupSessionArea').style.display = 'block';
    document.getElementById('activeGameArea').style.display = 'none';
    return;
  }

  const round = session.rounds ? session.rounds[session.currentRoundIdx] : null;
  const q = round ? round.question : null;

  const teamAName = session.teams.A.name || "TIM A";
  const teamBName = session.teams.B.name || "TIM B";

  document.getElementById('opSessionInfo').textContent = `${session.name} • ${session.school}`;
  document.getElementById('opCurrentRound').textContent = round ? `${session.currentRoundIdx + 1} / ${session.rounds.length}` : '0 / 0';
  document.getElementById('opPotScore').textContent = round ? round.potScore : 0;

  // Nama Tim Dinamis Sidebar
  document.getElementById('opTeamAName').textContent = teamAName;
  document.getElementById('opTeamAScore').textContent = session.teams.A.totalScore;
  document.getElementById('opStrikesA').textContent = round ? round.strikesA : 0;

  document.getElementById('opTeamBName').textContent = teamBName;
  document.getElementById('opTeamBScore').textContent = session.teams.B.totalScore;
  document.getElementById('opStrikesB').textContent = round ? round.strikesB : 0;

  document.getElementById('opQuestionText').textContent = q ? q.question : 'Pertandingan Selesai';
  document.getElementById('badgeStage').textContent = session.stage;

  if (session.timerState) {
    document.getElementById('opTimerVal').textContent = session.timerState.val;
  }

  const logContainer = document.getElementById('opHistoryList');
  logContainer.innerHTML = '';
  (session.historyLogs || []).forEach(log => {
    const d = document.createElement('div');
    d.textContent = log;
    logContainer.appendChild(d);
  });

  const panelDuel = document.getElementById('panelDuelControls');
  const panelMain = document.getElementById('panelMainControls');
  const panelEnd = document.getElementById('panelEndSessionControls');
  const cardBoard = document.getElementById('cardSurveyBoardOp');
  const cardQuestionBox = document.getElementById('cardQuestionBox');
  const btnNextRound = document.getElementById('btnNextRound');
  const btnEndSession = document.getElementById('btnEndSession');

  // Dynamic Button Labels
  const btnPickA = document.getElementById('btnPickTeamA');
  const btnPickB = document.getElementById('btnPickTeamB');
  if (btnPickA) btnPickA.textContent = `🎤 ${teamAName} Menjawab Pertama`;
  if (btnPickB) btnPickB.textContent = `🎤 ${teamBName} Menjawab Pertama`;

  // Penanganan SESSION_END
  if (session.stage === GameEngine.STAGES.SESSION_END) {
    if (panelDuel) panelDuel.style.display = 'none';
    if (panelMain) panelMain.style.display = 'none';
    if (btnNextRound) btnNextRound.style.display = 'none';
    if (btnEndSession) btnEndSession.style.display = 'none';
    if (cardBoard) cardBoard.style.display = 'none';
    if (cardQuestionBox) cardQuestionBox.style.display = 'none';
    
    if (panelEnd) {
      panelEnd.style.display = 'block';
      const scoreA = session.teams.A.totalScore;
      const scoreB = session.teams.B.totalScore;
      let winnerText = `Juara 1: ${teamAName}! 🎉`;

      if (scoreB > scoreA) {
        winnerText = `Juara 1: ${teamBName}! 🎉`;
      } else if (scoreA === scoreB) {
        winnerText = `Hasil Pertandingan: SERI / IMBANG! 🤝`;
      }

      document.getElementById('opWinnerTextLabel').textContent = winnerText;
      document.getElementById('opWinLabelA').textContent = teamAName;
      document.getElementById('opWinScoreA').textContent = scoreA;
      document.getElementById('opWinLabelB').textContent = teamBName;
      document.getElementById('opWinScoreB').textContent = scoreB;
    }
    return;
  }

  // Tampilan Sesi Berjalan
  if (panelEnd) panelEnd.style.display = 'none';
  if (cardBoard) cardBoard.style.display = 'block';
  if (cardQuestionBox) cardQuestionBox.style.display = 'block';
  if (btnEndSession) btnEndSession.style.display = 'inline-block';

  if (session.stage.startsWith('DUEL')) {
    panelDuel.style.display = 'block';
    panelMain.style.display = 'none';
    btnNextRound.style.display = 'none';

    if (session.stage === GameEngine.STAGES.DUEL_PICK_TIM1) {
      document.getElementById('duelStep1').style.display = 'block';
      document.getElementById('duelStep2').style.display = 'none';
      document.getElementById('duelStep3Choice').style.display = 'none';
    } else if (session.stage === GameEngine.STAGES.DUEL_TIM1_GUESS || session.stage === GameEngine.STAGES.DUEL_TIM2_GUESS) {
      document.getElementById('duelStep1').style.display = 'none';
      document.getElementById('duelStep2').style.display = 'block';
      document.getElementById('duelStep3Choice').style.display = 'none';

      const isTim1 = session.stage === GameEngine.STAGES.DUEL_TIM1_GUESS;
      const turnTeamKey = isTim1 ? session.duelData.firstTeam : session.duelData.secondTeam;
      const turnTeamName = session.teams[turnTeamKey] ? session.teams[turnTeamKey].name : turnTeamKey;

      document.getElementById('duelTurnInstruction').textContent = `Giliran ${turnTeamName} Menjawab (Duel Step ${isTim1 ? 1 : 2})`;
      document.getElementById('btnStrikeDuplicate').style.display = isTim1 ? 'none' : 'block';
      document.getElementById('btnStrikeDuplicate').textContent = `🚨 STRIKE - JAWABAN SAMA / SALAH (${turnTeamName})`;
    } else if (session.stage === GameEngine.STAGES.DUEL_CHOICE_PHASE) {
      document.getElementById('duelStep1').style.display = 'none';
      document.getElementById('duelStep2').style.display = 'none';
      document.getElementById('duelStep3Choice').style.display = 'block';
      
      const winnerKey = session.duelData.winnerTeam;
      const loserKey = winnerKey === 'A' ? 'B' : 'A';
      const winnerName = session.teams[winnerKey].name;
      const loserName = session.teams[loserKey].name;

      document.getElementById('duelWinnerTitle').textContent = `🏆 ${winnerName} MENANG DUEL!`;
      document.getElementById('btnChoiceMain').textContent = `🎯 Pilih MAIN (${winnerName} Main)`;
      document.getElementById('btnChoiceLempar').textContent = `➡️ Pilih LEMPAR (${loserName} Main)`;
    }
  } else if (session.stage === GameEngine.STAGES.MAIN_GAME || session.stage === GameEngine.STAGES.STEAL_OPPORTUNITY) {
    panelDuel.style.display = 'none';
    panelMain.style.display = 'block';
    btnNextRound.style.display = 'none';

    const mainTeamName = session.teams[session.mainTeam].name;
    const stealTeamName = session.teams[session.stealTeam].name;

    document.getElementById('opMainTeamLabel').textContent = `Tim Utama: ${mainTeamName}`;
    document.getElementById('btnAddStrikeOp').textContent = `❌ Tambah Strike (X) - ${mainTeamName}`;
    
    if (session.stage === GameEngine.STAGES.STEAL_OPPORTUNITY) {
      document.getElementById('panelStealButtons').style.display = 'block';
      const potLama = round ? (round.potBeforeSteal || round.potScore) : 0;
      document.getElementById('opStealInstruction').innerHTML = 
        `Tim Steal (<strong>${stealTeamName}</strong>) diberi 1 kali kesempatan menjawab.<br>` +
        `• Klik langsung jawaban di papan survei di bawah yang sesuai dengan tebakan Tim Steal untuk <strong>OTOMATIS STEAL BENAR</strong>.<br>` +
        `• Jika tebakan mereka SALAH, klik tombol <strong>STEAL SALAH</strong> di bawah.`;
      
      document.getElementById('btnStealWrong').textContent = `❌ STEAL SALAH (Poin Pot ${potLama} Poin Selamat ke ${mainTeamName})`;
    } else {
      document.getElementById('panelStealButtons').style.display = 'none';
    }
  } else if (session.stage === GameEngine.STAGES.ROUND_SUMMARY) {
    panelDuel.style.display = 'none';
    panelMain.style.display = 'none';
    btnNextRound.style.display = 'inline-block';
  }

  if (q && q.answers && round) {
    renderSurveyGrid(q.answers, round.revealedAnswers, session);
  }
}

function renderSurveyGrid(answers, revealedIndexes, session) {
  const container = document.getElementById('opSurveyGrid');
  container.innerHTML = '';

  answers.forEach((ans, idx) => {
    const isRevealed = revealedIndexes.includes(idx);
    const div = document.createElement('div');
    const isStealPhase = session && session.stage === GameEngine.STAGES.STEAL_OPPORTUNITY;
    const isSummaryPhase = session && session.stage === GameEngine.STAGES.ROUND_SUMMARY;

    div.style.cssText = `
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 14px; border-radius: 8px; border: 1px solid var(--card-border);
      background: ${isRevealed ? 'rgba(20, 184, 166, 0.15)' : 'rgba(30, 41, 59, 0.6)'};
      cursor: ${isRevealed ? 'default' : 'pointer'};
    `;

    let buttonLabel = 'Buka Jawaban';
    if (isRevealed) {
      buttonLabel = 'Terbuka';
    } else if (isStealPhase) {
      const stealTeamName = session.teams[session.stealTeam].name;
      buttonLabel = `⚡ STEAL BENAR (${stealTeamName})`;
    } else if (isSummaryPhase) {
      buttonLabel = '👁️ Tunjukkan di Proyektor';
    }

    div.innerHTML = `
      <div>
        <span style="font-weight: 800; color: var(--gold); margin-right: 8px;">#${ans.rank}</span>
        <span style="font-size: 15px; font-weight: 700; color: ${isRevealed ? 'var(--teal-accent)' : '#FFF'}">${ans.text}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 16px; font-weight: 800; color: var(--gold);">${ans.points} Poin</span>
        <button class="btn ${isRevealed ? 'btn-outline' : (isSummaryPhase ? 'btn-teal' : (isStealPhase ? 'btn-orange' : 'btn-teal'))}" style="padding: 6px 12px; font-size: 12px;" ${isRevealed ? 'disabled' : ''}>
          ${buttonLabel}
        </button>
      </div>
    `;

    if (!isRevealed) {
      div.addEventListener('click', () => handleAnswerClick(idx));
    }
    container.appendChild(div);
  });
}

function handleAnswerClick(ansIdx) {
  const session = DB.getActiveSession();
  if (!session) return;

  stopTimer(); // Auto-Pause Timer saat kartu diklik
  SoundFX.playCorrect();

  if (session.stage === GameEngine.STAGES.DUEL_TIM1_GUESS) {
    GameEngine.handleDuelTim1Answer(session, ansIdx);
  } else if (session.stage === GameEngine.STAGES.DUEL_TIM2_GUESS) {
    GameEngine.handleDuelTim2Answer(session, ansIdx, false);
  } else if (session.stage === GameEngine.STAGES.MAIN_GAME) {
    GameEngine.revealMainAnswer(session, ansIdx);
  } else if (session.stage === GameEngine.STAGES.STEAL_OPPORTUNITY) {
    handleStealOp(true, ansIdx);
    return;
  } else if (session.stage === GameEngine.STAGES.ROUND_SUMMARY) {
    const round = session.rounds[session.currentRoundIdx];
    if (!round.revealedAnswers.includes(ansIdx)) {
      round.revealedAnswers.push(ansIdx);
      DB.saveActiveSession(session);
    }
  }
  renderOperatorState();
}

function pickFirstTeam(teamKey) {
  const session = DB.getActiveSession();
  session.duelData.firstTeam = teamKey;
  session.duelData.secondTeam = teamKey === 'A' ? 'B' : 'A';
  session.stage = GameEngine.STAGES.DUEL_TIM1_GUESS;
  GameEngine.resetTimerToDefault(session);
  DB.saveActiveSession(session);
  renderOperatorState();
}

function handleDuplicateStrike() {
  stopTimer();
  const session = DB.getActiveSession();
  SoundFX.playStrike();
  GameEngine.handleDuelTim2Answer(session, null, true);
  renderOperatorState();
}

function makeMainChoice(choice) {
  const session = DB.getActiveSession();
  GameEngine.selectMainOrLempar(session, choice);
  renderOperatorState();
}

function addStrikeOp() {
  stopTimer();
  const session = DB.getActiveSession();
  SoundFX.playStrike();
  GameEngine.addStrike(session);
  renderOperatorState();
}

function handleStealOp(isCorrect, stealAnsIdx = null) {
  stopTimer();
  const session = DB.getActiveSession();
  if (isCorrect) SoundFX.playCorrect(); else SoundFX.playStrike();
  GameEngine.resolveSteal(session, isCorrect, stealAnsIdx);
  renderOperatorState();
}

function handleNextRound() {
  const session = DB.getActiveSession();
  GameEngine.nextRound(session);
  resetTimer();
  renderOperatorState();
}

function handleEndSession() {
  if (confirm('Akhiri sesi pertandingan sekarang dan umumkan pemenang?')) {
    const session = DB.getActiveSession();
    if (session) {
      session.stage = GameEngine.STAGES.SESSION_END;
      GameEngine.resetTimerToDefault(session);
      DB.addHistoryRecord(session);
      DB.saveActiveSession(session);
    }
    stopTimer();
    renderOperatorState();
  }
}

function resetAndCreateNewSession() {
  localStorage.removeItem('f100_active_session');
  document.getElementById('setupSessionArea').style.display = 'block';
  document.getElementById('activeGameArea').style.display = 'none';
  loadCategoryDropdownAndQuestionSelector();
}

// Timer Real-Time Functions (Selalu Berpatokan pada Durasi Bawaan Sesi)
function startTimer() {
  stopTimer();
  const session = DB.getActiveSession();
  const defaultSec = session && session.timerState && session.timerState.defaultSec ? session.timerState.defaultSec : (DB.getSettings().timerSec || 15);
  
  // Jika timer sudah 0 atau belum berjalan, otomatis reset kembali ke durasi bawaan sesi
  if (!session || !session.timerState || session.timerState.val <= 0) {
    currentTimerVal = defaultSec;
  } else {
    currentTimerVal = session.timerState.val;
  }

  updateTimerInSession(currentTimerVal, true);

  timerInterval = setInterval(() => {
    currentTimerVal--;
    SoundFX.playTimerTick();

    if (currentTimerVal <= 0) {
      stopTimer();
      SoundFX.playStrike();

      // Pengecekan Sakelar Auto-Strike saat Timer 0s
      const chkAutoStrike = document.getElementById('chkAutoStrikeToggle');
      const autoStrikeOn = chkAutoStrike ? chkAutoStrike.checked : false;

      if (autoStrikeOn && session && session.stage === GameEngine.STAGES.MAIN_GAME) {
        GameEngine.addStrike(session);
      }

      updateTimerInSession(0, false);
      renderOperatorState();
    } else {
      updateTimerInSession(currentTimerVal, true);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  updateTimerInSession(currentTimerVal, false);
}

function resetTimer() {
  stopTimer();
  const session = DB.getActiveSession();
  const defaultSec = session && session.timerState && session.timerState.defaultSec ? session.timerState.defaultSec : (DB.getSettings().timerSec || 15);
  currentTimerVal = defaultSec;
  updateTimerInSession(defaultSec, false);
}

function updateTimerInSession(val, running) {
  const session = DB.getActiveSession();
  if (session) {
    if (!session.timerState) session.timerState = { val: val, defaultSec: 15, running: running };
    session.timerState.val = val;
    session.timerState.running = running;
    DB.saveActiveSession(session);
  }
  document.getElementById('opTimerVal').textContent = val;
}
