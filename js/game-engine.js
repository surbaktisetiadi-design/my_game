/**
 * Family 100 V5 - Game Engine Logic (Option B Steal Rules & Reset Pot to 0)
 */
const GameEngine = (function() {
  const STAGES = {
    IDLE: 'IDLE',
    DUEL_PICK_TIM1: 'DUEL_PICK_TIM1',
    DUEL_TIM1_GUESS: 'DUEL_TIM1_GUESS',
    DUEL_TIM2_GUESS: 'DUEL_TIM2_GUESS',
    DUEL_CHOICE_PHASE: 'DUEL_CHOICE_PHASE',
    MAIN_GAME: 'MAIN_GAME',
    STEAL_OPPORTUNITY: 'STEAL_OPPORTUNITY',
    ROUND_SUMMARY: 'ROUND_SUMMARY',
    SESSION_END: 'SESSION_END'
  };

  function createNewSession(sessionName, selectedQuestionIds, defaultTimerSec = 15) {
    const allQuestions = DB.getQuestions();
    const questions = allQuestions.filter(q => selectedQuestionIds.includes(q.id));
    const teams = DB.getTeams();
    const school = DB.getSchool();

    const session = {
      name: sessionName,
      school: school.name,
      eventName: school.eventName,
      teams: {
        A: { name: teams.teamA.name || "TIM A", totalScore: 0 },
        B: { name: teams.teamB.name || "TIM B", totalScore: 0 }
      },
      rounds: questions.map((q, idx) => ({
        roundNum: idx + 1,
        question: q,
        revealedAnswers: [],
        potScore: 0,
        potBeforeSteal: 0,
        strikesA: 0,
        strikesB: 0,
        winner: null,
        scoreA: 0,
        scoreB: 0,
        completed: false
      })),
      currentRoundIdx: 0,
      stage: STAGES.DUEL_PICK_TIM1,
      duelData: {
        firstTeam: null,
        secondTeam: null,
        ansTim1Idx: null,
        ansTim2Idx: null,
        winnerTeam: null
      },
      mainTeam: null,
      stealTeam: null,
      timerState: {
        val: defaultTimerSec,
        defaultSec: defaultTimerSec,
        running: false
      },
      lastAction: null,
      historyLogs: [],
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    };

    DB.saveActiveSession(session);
    return session;
  }

  function resetTimerToDefault(session) {
    if (session && session.timerState) {
      session.timerState.val = session.timerState.defaultSec;
      session.timerState.running = false;
    }
  }

  function handleDuelTim1Answer(session, ansIdx) {
    session.duelData.ansTim1Idx = ansIdx;
    const ans = session.rounds[session.currentRoundIdx].question.answers[ansIdx];

    if (!session.rounds[session.currentRoundIdx].revealedAnswers.includes(ansIdx)) {
      session.rounds[session.currentRoundIdx].revealedAnswers.push(ansIdx);
    }
    recalculatePot(session);
    resetTimerToDefault(session);

    if (ans.rank === 1) {
      session.duelData.winnerTeam = session.duelData.firstTeam;
      session.stage = STAGES.DUEL_CHOICE_PHASE;
      logHistory(session, `Duel: ${session.teams[session.duelData.firstTeam].name} mendapat TOP SURVEY (Rank 1). Langsung Menang Duel!`);
    } else {
      session.stage = STAGES.DUEL_TIM2_GUESS;
      logHistory(session, `Duel: ${session.teams[session.duelData.firstTeam].name} mendapat Peringkat ${ans.rank} (${ans.points} Poin). Giliran ${session.teams[session.duelData.secondTeam].name}.`);
    }
    DB.saveActiveSession(session);
  }

  function handleDuelTim2Answer(session, ansIdx, isDuplicateStrike) {
    const firstTeam = session.duelData.firstTeam;
    const secondTeam = session.duelData.secondTeam;
    resetTimerToDefault(session);

    if (isDuplicateStrike) {
      session.duelData.winnerTeam = firstTeam;
      session.stage = STAGES.DUEL_CHOICE_PHASE;
      session.lastAction = { type: 'STRIKE', count: 1, team: secondTeam, time: Date.now() };
      logHistory(session, `Duel: ${session.teams[secondTeam].name} JAWABAN SAMA (Strike). ${session.teams[firstTeam].name} Menang Duel!`);
      DB.saveActiveSession(session);
      return;
    }

    session.duelData.ansTim2Idx = ansIdx;
    const qAnswers = session.rounds[session.currentRoundIdx].question.answers;
    const ansTim1 = qAnswers[session.duelData.ansTim1Idx];
    const ansTim2 = qAnswers[ansIdx];

    if (!session.rounds[session.currentRoundIdx].revealedAnswers.includes(ansIdx)) {
      session.rounds[session.currentRoundIdx].revealedAnswers.push(ansIdx);
    }
    recalculatePot(session);

    if (ansTim2.rank === 1) {
      session.duelData.winnerTeam = secondTeam;
      session.stage = STAGES.DUEL_CHOICE_PHASE;
      logHistory(session, `Duel: ${session.teams[secondTeam].name} mendapat TOP SURVEY (Rank 1). Langsung Menang Duel!`);
    } else {
      if (ansTim1.rank < ansTim2.rank) {
        session.duelData.winnerTeam = firstTeam;
        logHistory(session, `Duel: Rank ${ansTim1.rank} (${session.teams[firstTeam].name}) mengalahkan Rank ${ansTim2.rank}. ${session.teams[firstTeam].name} Menang Duel!`);
      } else {
        session.duelData.winnerTeam = secondTeam;
        logHistory(session, `Duel: Rank ${ansTim2.rank} (${session.teams[secondTeam].name}) mengalahkan Rank ${ansTim1.rank}. ${session.teams[secondTeam].name} Menang Duel!`);
      }
      session.stage = STAGES.DUEL_CHOICE_PHASE;
    }
    DB.saveActiveSession(session);
  }

  function selectMainOrLempar(session, choice) {
    const duelWinner = session.duelData.winnerTeam;
    const duelLoser = duelWinner === 'A' ? 'B' : 'A';

    if (choice === 'MAIN') {
      session.mainTeam = duelWinner;
      session.stealTeam = duelLoser;
    } else {
      session.mainTeam = duelLoser;
      session.stealTeam = duelWinner;
    }

    recalculatePot(session);
    resetTimerToDefault(session);
    session.stage = STAGES.MAIN_GAME;
    logHistory(session, `${session.teams[duelWinner].name} memilih ${choice}. Tim Utama: ${session.teams[session.mainTeam].name}`);
    DB.saveActiveSession(session);
  }

  function recalculatePot(session) {
    const round = session.rounds[session.currentRoundIdx];
    let pot = 0;
    round.revealedAnswers.forEach(idx => {
      pot += round.question.answers[idx].points;
    });
    round.potScore = pot;
  }

  function revealMainAnswer(session, ansIdx) {
    const round = session.rounds[session.currentRoundIdx];
    resetTimerToDefault(session);

    if (!round.revealedAnswers.includes(ansIdx)) {
      round.revealedAnswers.push(ansIdx);
      recalculatePot(session);
      logHistory(session, `Jawaban terbuka: ${round.question.answers[ansIdx].text} (${round.question.answers[ansIdx].points} Poin)`);

      if (session.stage === STAGES.MAIN_GAME && round.revealedAnswers.length === round.question.answers.length) {
        awardPotToTeam(session, session.mainTeam, round.potScore);
        round.potScore = 0;
        logHistory(session, `Semua jawaban telah terbuka! Ronde selesai.`);
      }
    }
    DB.saveActiveSession(session);
  }

  function addStrike(session) {
    const round = session.rounds[session.currentRoundIdx];
    const team = session.mainTeam;

    if (team === 'A') round.strikesA++;
    else round.strikesB++;

    const currentStrikes = team === 'A' ? round.strikesA : round.strikesB;
    session.lastAction = { type: 'STRIKE', count: currentStrikes, team: team, time: Date.now() };

    logHistory(session, `Strike ${currentStrikes} untuk ${session.teams[team].name}`);
    resetTimerToDefault(session);

    if (currentStrikes >= 3) {
      round.potBeforeSteal = round.potScore;
      session.stage = STAGES.STEAL_OPPORTUNITY;
      logHistory(session, `3 Strike! Kesempatan STEAL diberikan kepada ${session.teams[session.stealTeam].name} (Poin Pot Sebelum Steal: ${round.potBeforeSteal})`);
    }
    DB.saveActiveSession(session);
  }

  function resolveSteal(session, isCorrect, stealAnsIdx = null) {
    const round = session.rounds[session.currentRoundIdx];
    const potToAward = round.potBeforeSteal || round.potScore;

    if (stealAnsIdx !== null && !round.revealedAnswers.includes(stealAnsIdx)) {
      round.revealedAnswers.push(stealAnsIdx);
      logHistory(session, `Jawaban STEAL dibuka di proyektor: ${round.question.answers[stealAnsIdx].text}`);
    }

    if (isCorrect) {
      awardPotToTeam(session, session.stealTeam, potToAward);
      logHistory(session, `STEAL BENAR! Poin Pot Lama (${potToAward} Poin) dicuri oleh ${session.teams[session.stealTeam].name}!`);
    } else {
      awardPotToTeam(session, session.mainTeam, potToAward);
      logHistory(session, `STEAL SALAH! Poin Pot Lama (${potToAward} Poin) selamat dan diberikan kepada ${session.teams[session.mainTeam].name}!`);
    }

    round.potScore = 0;
    resetTimerToDefault(session);
    DB.saveActiveSession(session);
  }

  function awardPotToTeam(session, winningTeam, awardedPoints) {
    const round = session.rounds[session.currentRoundIdx];
    round.winner = winningTeam;
    if (winningTeam === 'A') {
      round.scoreA = awardedPoints;
      session.teams.A.totalScore += awardedPoints;
    } else {
      round.scoreB = awardedPoints;
      session.teams.B.totalScore += awardedPoints;
    }
    round.completed = true;
    session.stage = STAGES.ROUND_SUMMARY;
    resetTimerToDefault(session);
  }

  function nextRound(session) {
    if (session.currentRoundIdx < session.rounds.length - 1) {
      session.currentRoundIdx++;
      session.stage = STAGES.DUEL_PICK_TIM1;
      session.duelData = { firstTeam: null, secondTeam: null, ansTim1Idx: null, ansTim2Idx: null, winnerTeam: null };
      session.mainTeam = null;
      session.stealTeam = null;
      resetTimerToDefault(session);
      logHistory(session, `Memulai Ronde ${session.currentRoundIdx + 1}`);
    } else {
      session.stage = STAGES.SESSION_END;
      resetTimerToDefault(session);
      DB.addHistoryRecord(session);
      logHistory(session, `Seluruh ronde selesai! Pertandingan berakhir.`);
    }
    DB.saveActiveSession(session);
  }

  function logHistory(session, text) {
    session.historyLogs.unshift(`[Ronde ${session.currentRoundIdx + 1}] ${text}`);
  }

  return {
    STAGES,
    createNewSession,
    handleDuelTim1Answer,
    handleDuelTim2Answer,
    selectMainOrLempar,
    revealMainAnswer,
    addStrike,
    resolveSteal,
    nextRound,
    resetTimerToDefault
  };
})();
