/**
 * Family 100 V5 - Data Persistence & Storage Manager
 */
const appBC = (typeof window !== 'undefined' && window.BroadcastChannel) ? new BroadcastChannel('f100_channel') : null;

const DB = (function() {
  const KEYS = {
    SCHOOL: 'f100_school_profile',
    TEAMS: 'f100_teams_config',
    QUESTIONS: 'f100_questions_bank',
    SESSION: 'f100_active_session',
    HISTORY: 'f100_session_history',
    SETTINGS: 'f100_app_settings'
  };

  const defaultSchool = {
    name: "SMAN 1 BANGKO PUSAKO",
    logo: "",
    eventName: "LOMBA FAMILY 100 SCHOOL QUIZ",
    year: "2026",
    organizer: "OSIS & Panitia Kuis",
    headmaster: "-",
    mcName: "Pembawa Acara",
    operatorName: "Operator Sesi"
  };

  const defaultTeams = {
    teamA: { name: "TIM A", captain: "Kapten A", members: "Anggota 1, 2, 3", color: "#2563EB", logo: "" },
    teamB: { name: "TIM B", captain: "Kapten B", members: "Anggota 1, 2, 3", color: "#14B8A6", logo: "" }
  };

  const defaultSettings = {
    timerSec: 15,
    autoStrikeEnabled: false,
    soundEnabled: true,
    strikeLimit: 3
  };

  function init() {
    if (!localStorage.getItem(KEYS.SCHOOL)) {
      localStorage.setItem(KEYS.SCHOOL, JSON.stringify(defaultSchool));
    }
    if (!localStorage.getItem(KEYS.TEAMS)) {
      localStorage.setItem(KEYS.TEAMS, JSON.stringify(defaultTeams));
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(defaultSettings));
    }
    if (!localStorage.getItem(KEYS.QUESTIONS)) {
      fetch('data/questions.json')
        .then(res => res.json())
        .then(data => {
          localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(data));
        })
        .catch(() => {
          localStorage.setItem(KEYS.QUESTIONS, JSON.stringify([]));
        });
    }
  }

  init();

  return {
    getSchool: () => JSON.parse(localStorage.getItem(KEYS.SCHOOL)) || defaultSchool,
    saveSchool: (data) => localStorage.setItem(KEYS.SCHOOL, JSON.stringify(data)),
    
    getTeams: () => JSON.parse(localStorage.getItem(KEYS.TEAMS)) || defaultTeams,
    saveTeams: (data) => localStorage.setItem(KEYS.TEAMS, JSON.stringify(data)),

    getSettings: () => JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || defaultSettings,
    saveSettings: (data) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data)),

    getQuestions: () => JSON.parse(localStorage.getItem(KEYS.QUESTIONS)) || [],
    saveQuestions: (data) => localStorage.setItem(KEYS.QUESTIONS, JSON.stringify(data)),

    getActiveSession: () => JSON.parse(localStorage.getItem(KEYS.SESSION)),
    saveActiveSession: (data) => {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(data));
      if (appBC) {
        try {
          appBC.postMessage({ type: 'SESSION_UPDATE', data: data });
        } catch(e) {}
      }
    },

    getHistory: () => JSON.parse(localStorage.getItem(KEYS.HISTORY)) || [],
    saveHistory: (data) => localStorage.setItem(KEYS.HISTORY, JSON.stringify(data)),
    addHistoryRecord: (record) => {
      const history = DB.getHistory();
      const existsIndex = history.findIndex(h => h.timestamp === record.timestamp && h.name === record.name);
      if (existsIndex !== -1) {
        history[existsIndex] = record;
      } else {
        history.unshift(record);
      }
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    },
    deleteHistoryRecord: (index) => {
      const history = DB.getHistory();
      if (index >= 0 && index < history.length) {
        history.splice(index, 1);
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
      }
    },
    clearAllHistory: () => {
      localStorage.setItem(KEYS.HISTORY, JSON.stringify([]));
    }
  };
})();
