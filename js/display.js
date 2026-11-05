/**
 * Family 100 V5 - Projector Display View Controller
 * Features:
 * - Real-Time Synchronized Timer Widget
 * - Grand Winner Celebration Overlay Screen
 */
let lastHandledActionTime = 0;

document.addEventListener('DOMContentLoaded', () => {
  buildFixedBoardSlots();
  renderDisplay();

  setInterval(renderDisplay, 150);

  window.addEventListener('storage', (e) => {
    if (e.key === 'f100_active_session') {
      renderDisplay();
    }
  });

  if (window.BroadcastChannel) {
    try {
      const bc = new BroadcastChannel('f100_channel');
      bc.onmessage = (e) => {
        if (e.data && e.data.type === 'SESSION_UPDATE') {
          renderDisplay();
        }
      };
    } catch(e) {}
  }
});

function buildFixedBoardSlots() {
  const container = document.getElementById('dispBoardContainer');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 1; i <= 8; i++) {
    const slot = document.createElement('div');
    slot.className = 'survey-row';
    slot.id = `surveySlot_${i}`;

    slot.innerHTML = `
      <div class="survey-card" id="surveyCard_${i}">
        <div class="card-face front" id="cardFront_${i}">
          <div class="rank-num" id="rankNum_${i}">${i}</div>
        </div>
        <div class="card-face back" id="cardBack_${i}">
          <span class="ans-text" id="ansText_${i}">-</span>
          <span class="ans-pts" id="ansPts_${i}">0</span>
        </div>
      </div>
    `;
    container.appendChild(slot);
  }
}

function renderDisplay() {
  try {
    const session = DB.getActiveSession();
    const school = DB.getSchool();

    const elSchool = document.getElementById('dispSchool');
    const elEvent = document.getElementById('dispEvent');
    if (elSchool) elSchool.textContent = school.name || '';
    if (elEvent) elEvent.textContent = school.eventName || '';

    const winnerOverlay = document.getElementById('winnerOverlay');

    if (!session) {
      if (winnerOverlay) winnerOverlay.classList.remove('active');
      document.getElementById('dispQuestion').textContent = "MENUNGGU PERTANDINGAN DIMULAI...";
      document.getElementById('dispTeamAName').textContent = "TIM A";
      document.getElementById('dispTeamBName').textContent = "TIM B";
      document.getElementById('dispTeamAScore').textContent = "0";
      document.getElementById('dispTeamBScore').textContent = "0";
      document.getElementById('dispPotVal').textContent = "0";
      resetBoardToBlank();
      return;
    }

    const teamAName = session.teams.A.name || "TIM A";
    const teamBName = session.teams.B.name || "TIM B";

    if (session.stage === 'SESSION_END') {
      if (winnerOverlay && !winnerOverlay.classList.contains('active')) {
        winnerOverlay.classList.add('active');
        if (typeof SoundFX !== 'undefined') SoundFX.playWinnerFanfare();
      }

      const scoreA = session.teams.A.totalScore;
      const scoreB = session.teams.B.totalScore;
      let winnerName = teamAName;

      if (scoreB > scoreA) {
        winnerName = teamBName;
      } else if (scoreA === scoreB) {
        winnerName = "SERI / IMBANG!";
      }

      document.getElementById('winTeamName').textContent = winnerName;
      document.getElementById('winLabelTeamA').textContent = teamAName;
      document.getElementById('winScoreTeamA').textContent = scoreA;
      document.getElementById('winLabelTeamB').textContent = teamBName;
      document.getElementById('winScoreTeamB').textContent = scoreB;
      return;
    } else {
      if (winnerOverlay) winnerOverlay.classList.remove('active');
    }

    const round = session.rounds ? session.rounds[session.currentRoundIdx] : null;
    const q = round ? round.question : null;

    document.getElementById('dispQuestion').textContent = q ? q.question : '';
    document.getElementById('dispTeamAName').textContent = teamAName;
    document.getElementById('dispTeamBName').textContent = teamBName;
    document.getElementById('dispTeamAScore').textContent = session.teams.A.totalScore;
    document.getElementById('dispTeamBScore').textContent = session.teams.B.totalScore;
    
    document.getElementById('dispPotVal').textContent = round ? round.potScore : 0;

    // Timer Sync
    const timerValEl = document.getElementById('dispTimerVal');
    const timerBoxEl = document.getElementById('displayTimerBox');
    if (timerValEl && session.timerState) {
      timerValEl.textContent = session.timerState.val;
      if (session.timerState.running) {
        timerBoxEl.classList.add('timer-running');
      } else {
        timerBoxEl.classList.remove('timer-running');
      }
    }

    document.getElementById('dispStrikesA').textContent = "❌ ".repeat(round ? (round.strikesA || 0) : 0);
    document.getElementById('dispStrikesB').textContent = "❌ ".repeat(round ? (round.strikesB || 0) : 0);

    const cardA = document.getElementById('cardTeamA');
    const cardB = document.getElementById('cardTeamB');
    if (cardA && cardB) {
      cardA.classList.remove('active-turn');
      cardB.classList.remove('active-turn');
      if (session.mainTeam === 'A') cardA.classList.add('active-turn');
      if (session.mainTeam === 'B') cardB.classList.add('active-turn');
    }

    if (session.lastAction && session.lastAction.type === 'STRIKE' && session.lastAction.time > lastHandledActionTime) {
      lastHandledActionTime = session.lastAction.time;
      triggerStrikeOverlay(session.lastAction.count);
      if (typeof SoundFX !== 'undefined') SoundFX.playStrike();
    }

    const statusMsg = document.getElementById('dispStatusMsg');
    if (statusMsg) {
      const stages = (typeof GameEngine !== 'undefined') ? GameEngine.STAGES : {};
      if (session.stage === stages.DUEL_PICK_TIM1) {
        statusMsg.textContent = "⚔️ FASE DUEL PEMBUKA - PERSIAPAN JAWABAN";
      } else if (session.stage === stages.DUEL_TIM1_GUESS || session.stage === stages.DUEL_TIM2_GUESS) {
        statusMsg.textContent = "⚔️ FASE DUEL PEMBUKA - MENEBAK SURVEI";
      } else if (session.stage === stages.DUEL_CHOICE_PHASE) {
        const winnerKey = session.duelData.winnerTeam;
        const winnerTeamName = session.teams[winnerKey] ? session.teams[winnerKey].name : winnerKey;
        statusMsg.textContent = `🎉 ${winnerTeamName} MENANG DUEL! MEMILIH MAIN ATAU LEMPAR...`;
      } else if (session.stage === stages.MAIN_GAME) {
        const mainTeamName = session.teams[session.mainTeam] ? session.teams[session.mainTeam].name : session.mainTeam;
        statusMsg.textContent = `🎯 GILIRAN UTAMA: ${mainTeamName}`;
      } else if (session.stage === stages.STEAL_OPPORTUNITY) {
        const stealTeamName = session.teams[session.stealTeam] ? session.teams[session.stealTeam].name : session.stealTeam;
        const potLama = round ? (round.potBeforeSteal || round.potScore) : 0;
        statusMsg.textContent = `🚨 KESEMPATAN STEAL DIBERIKAN KEPADA ${stealTeamName}! (TARUHAN POT LAMA: ${potLama} POIN)`;
      } else if (session.stage === stages.ROUND_SUMMARY) {
        const winTeamName = session.teams[round.winner] ? session.teams[round.winner].name : '-';
        statusMsg.textContent = `🏆 RONDE ${session.currentRoundIdx + 1} SELESAI! PEMENANG RONDE: ${winTeamName}`;
      }
    }

    if (q && q.answers) {
      updateBoardCards(q.answers, round.revealedAnswers || []);
    }
  } catch(e) {
    console.error('Error rendering display:', e);
  }
}

function resetBoardToBlank() {
  for (let i = 1; i <= 8; i++) {
    const card = document.getElementById(`surveyCard_${i}`);
    const front = document.getElementById(`cardFront_${i}`);
    if (card) card.classList.remove('revealed');
    if (front) front.classList.add('blank-slot');
  }
}

function updateBoardCards(answers, revealedIndexes) {
  for (let i = 1; i <= 8; i++) {
    const card = document.getElementById(`surveyCard_${i}`);
    const front = document.getElementById(`cardFront_${i}`);
    const back = document.getElementById(`cardBack_${i}`);
    const rankNum = document.getElementById(`rankNum_${i}`);
    const ansText = document.getElementById(`ansText_${i}`);
    const ansPts = document.getElementById(`ansPts_${i}`);

    if (!card || !front || !back) continue;

    const ansData = answers[i - 1];

    if (ansData) {
      front.classList.remove('blank-slot');
      if (rankNum) rankNum.textContent = ansData.rank || i;
      if (ansText) ansText.textContent = ansData.text;
      if (ansPts) ansPts.textContent = ansData.points;

      const isRevealed = revealedIndexes.includes(i - 1);
      if (isRevealed) {
        card.classList.add('revealed');
      } else {
        card.classList.remove('revealed');
      }
    } else {
      front.classList.add('blank-slot');
      if (rankNum) rankNum.textContent = i;
      card.classList.remove('revealed');
    }
  }
}

function triggerStrikeOverlay(strikeCount) {
  const overlay = document.getElementById('strikeOverlay');
  const container = document.getElementById('strikeMarksContainer');
  const label = document.getElementById('strikeTextLabel');
  if (!overlay || !container) return;

  container.innerHTML = '';
  for (let i = 0; i < strikeCount; i++) {
    const mark = document.createElement('div');
    mark.className = 'strike-x';
    mark.textContent = '❌';
    container.appendChild(mark);
  }

  label.textContent = `STRIKE ${strikeCount}!`;
  overlay.classList.add('active');

  setTimeout(() => {
    overlay.classList.remove('active');
  }, 1600);
}
