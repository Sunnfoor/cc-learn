let timer = null;
let isRunning = false;
let remainingSeconds = 25 * 60;
let pomodoroCount = 0;
let currentState = 'work';

const CIRCUMFERENCE = 2 * Math.PI * 90;

let settings = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15
};

const timeDisplay = document.getElementById('time');
const stateText = document.getElementById('state-text');
const countDisplay = document.getElementById('count');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const settingsBtn = document.getElementById('settingsBtn');
const progressBar = document.querySelector('.progress-bar');
const settingsModal = document.getElementById('settingsModal');
const saveSettingsBtn = document.getElementById('saveSettings');
const cancelSettingsBtn = document.getElementById('cancelSettings');

const statsBtn = document.getElementById('statsBtn');
const statsModal = document.getElementById('statsModal');
const weeklyTab = document.getElementById('weeklyTab');
const monthlyTab = document.getElementById('monthlyTab');
const prevPeriod = document.getElementById('prevPeriod');
const nextPeriod = document.getElementById('nextPeriod');
const statsPeriod = document.getElementById('statsPeriod');
const statsContent = document.getElementById('statsContent');
const closeStatsBtn = document.getElementById('closeStats');

let currentStatsType = 'weekly';
let currentPeriodOffset = 0;

const workInput = document.getElementById('workDuration');
const shortBreakInput = document.getElementById('shortBreak');
const longBreakInput = document.getElementById('longBreak');

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateDisplay() {
  timeDisplay.textContent = formatTime(remainingSeconds);

  const totalSeconds = currentState === 'work'
    ? settings.workDuration * 60
    : currentState === 'shortBreak'
    ? settings.shortBreak * 60
    : settings.longBreak * 60;

  const progress = remainingSeconds / totalSeconds;
  const offset = CIRCUMFERENCE * (1 - progress);
  progressBar.style.strokeDashoffset = offset;
}

function updateStateText() {
  const stateMap = {
    'work': '工作中',
    'shortBreak': '短休息',
    'longBreak': '长休息'
  };
  stateText.textContent = stateMap[currentState];
}

function updateProgressColor() {
  if (currentState === 'work') {
    progressBar.style.stroke = '#e94560';
    progressBar.classList.remove('break');
  } else {
    progressBar.style.stroke = '#0f3460';
    progressBar.classList.add('break');
  }
}

function getNextState() {
  if (currentState === 'work') {
    pomodoroCount++;
    if (pomodoroCount % 2 === 0) {
      return 'longBreak';
    }
    return 'shortBreak';
  }
  return 'work';
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function saveSession(type, duration) {
  const session = {
    id: generateId(),
    type: type,
    duration: duration,
    completedAt: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0]
  };
  await window.electronAPI.sessionAdd(session);

  // Update stats
  const sessions = await window.electronAPI.storeGet('sessions') || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === todayStr && s.type === 'work');
  countDisplay.textContent = `已完成 ${todaySessions.length} 个番茄钟`;
}

function switchState() {
  const previousState = currentState;
  currentState = getNextState();
  const duration = currentState === 'work'
    ? settings.workDuration
    : currentState === 'shortBreak'
    ? settings.shortBreak
    : settings.longBreak;
  remainingSeconds = duration * 60;

  updateStateText();
  updateProgressColor();
  updateDisplay();

  // Save completed session
  if (previousState === 'work') {
    saveSession('work', settings.workDuration * 60);
  }
}

function startTimer() {
  if (isRunning) {
    clearInterval(timer);
    isRunning = false;
    startBtn.textContent = '继续';
  } else {
    isRunning = true;
    startBtn.textContent = '暂停';
    timer = setInterval(() => {
      remainingSeconds--;
      updateDisplay();

      if (remainingSeconds <= 0) {
        clearInterval(timer);
        isRunning = false;
        startBtn.textContent = '开始';
        switchState();
      }
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timer);
  isRunning = false;
  currentState = 'work';
  remainingSeconds = settings.workDuration * 60;
  pomodoroCount = 0;
  startBtn.textContent = '开始';
  updateStateText();
  updateProgressColor();
  updateDisplay();
  countDisplay.textContent = '已完成 0 个番茄钟';
}

function openSettings() {
  workInput.value = settings.workDuration;
  shortBreakInput.value = settings.shortBreak;
  longBreakInput.value = settings.longBreak;
  settingsModal.classList.remove('hidden');
}

function closeSettings() {
  settingsModal.classList.add('hidden');
}

async function saveSettings() {
  settings.workDuration = parseInt(workInput.value) || 25;
  settings.shortBreak = parseInt(shortBreakInput.value) || 5;
  settings.longBreak = parseInt(longBreakInput.value) || 15;

  // Save settings to store
  await window.electronAPI.storeSet('settings', settings);

  if (!isRunning) {
    remainingSeconds = currentState === 'work'
      ? settings.workDuration * 60
      : currentState === 'shortBreak'
      ? settings.shortBreak * 60
      : settings.longBreak * 60;
    updateDisplay();
  }

  closeSettings();
}

// Load saved data on startup
async function loadSavedData() {
  try {
    // Load settings
    const savedSettings = await window.electronAPI.storeGet('settings');
    if (savedSettings) {
      settings = savedSettings;
    }

    // Load today's sessions count
    const sessions = await window.electronAPI.storeGet('sessions') || [];
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === todayStr && s.type === 'work');
    countDisplay.textContent = `已完成 ${todaySessions.length} 个番茄钟`;
  } catch (e) {
    console.log('No saved data found');
  }
}

progressBar.style.strokeDasharray = CIRCUMFERENCE;
loadSavedData();
updateDisplay();

startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);
settingsBtn.addEventListener('click', openSettings);
saveSettingsBtn.addEventListener('click', saveSettings);
cancelSettingsBtn.addEventListener('click', closeSettings);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    closeSettings();
  }
});

// Global shortcut: Ctrl+Shift+P to toggle timer
window.electronAPI.onShortcutToggle(() => {
  startTimer();
});

// Stats functions
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分' : ''}`;
  }
  return `${mins}分钟`;
}

function getWeekRange(weekOffset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday + weekOffset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday,
    end: sunday,
    year: monday.getFullYear(),
    week: Math.ceil(((monday - new Date(monday.getFullYear(), 0, 1)) / 86400000 + new Date(monday.getFullYear(), 0, 1).getDay() + 1) / 7)
  };
}

function getMonthRange(monthOffset) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset;

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return { start, end, year, month: month % 12 };
}

async function getSessionsInRange(startDate, endDate) {
  const sessions = await window.electronAPI.storeGet('sessions') || [];
  return sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return s.type === 'work' && sessionDate >= startDate && sessionDate <= endDate;
  });
}

async function calculateWeeklyStats(weekOffset) {
  const range = getWeekRange(weekOffset);
  const sessions = await getSessionsInRange(range.start, range.end);

  const dailyStats = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(range.start);
    d.setDate(range.start.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    dailyStats[dateStr] = { count: 0, minutes: 0 };
  }

  sessions.forEach(s => {
    if (dailyStats[s.date]) {
      dailyStats[s.date].count++;
      dailyStats[s.date].minutes += Math.round(s.duration / 60);
    }
  });

  const totalPomodoros = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  const avgPerDay = totalPomodoros / 7;

  // Compare with previous week
  const prevRange = getWeekRange(weekOffset - 1);
  const prevSessions = await getSessionsInRange(prevRange.start, prevRange.end);
  const prevTotal = prevSessions.length;
  const trend = prevTotal > 0 ? Math.round((totalPomodoros - prevTotal) / prevTotal * 100) : null;

  return {
    period: `${range.year}年${range.start.getMonth() + 1}月第${range.week}周`,
    dateRange: `${range.start.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} - ${range.end.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}`,
    totalPomodoros,
    totalMinutes,
    avgPerDay: avgPerDay.toFixed(1),
    trend,
    dailyStats
  };
}

async function calculateMonthlyStats(monthOffset) {
  const range = getMonthRange(monthOffset);
  const sessions = await getSessionsInRange(range.start, range.end);

  const weeksInMonth = [];
  let currentWeekStart = new Date(range.start);

  while (currentWeekStart <= range.end) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekSessions = sessions.filter(s => {
      const d = new Date(s.date);
      return d >= currentWeekStart && d <= weekEnd;
    });

    weeksInMonth.push({
      label: `第${weeksInMonth.length + 1}周`,
      count: weekSessions.length,
      minutes: weekSessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0)
    });

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  const totalPomodoros = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);
  const avgPerDay = totalPomodoros / range.end.getDate();

  // Compare with previous month
  const prevRange = getMonthRange(monthOffset - 1);
  const prevSessions = await getSessionsInRange(prevRange.start, prevRange.end);
  const prevTotal = prevSessions.length;
  const trend = prevTotal > 0 ? Math.round((totalPomodoros - prevTotal) / prevTotal * 100) : null;

  return {
    period: `${range.year}年${range.month + 1}月`,
    dateRange: `${range.start.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} - ${range.end.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}`,
    totalPomodoros,
    totalMinutes,
    avgPerDay: avgPerDay.toFixed(1),
    trend,
    weeks: weeksInMonth
  };
}

function renderWeeklyStats(stats) {
  const trendClass = stats.trend !== null && stats.trend < 0 ? 'down' : '';
  const trendText = stats.trend !== null
    ? (stats.trend >= 0 ? `↑ 比上周+${stats.trend}%` : `↓ 比上周${stats.trend}%`)
    : '（无上周数据）';

  let html = `
    <div class="stats-summary">
      <div class="stats-main-number">${stats.totalPomodoros}</div>
      <div class="stats-main-label">个番茄钟</div>
    </div>
    <div class="stats-detail-row">
      <span>总时长</span>
      <span>${formatDuration(stats.totalMinutes)}</span>
    </div>
    <div class="stats-detail-row">
      <span>日均</span>
      <span>${stats.avgPerDay} 个</span>
    </div>
    <div class="stats-detail-row">
      <span>本周趋势</span>
      <span class="stats-trend ${trendClass}">${trendText}</span>
    </div>
    <div class="stats-detail-row">
      <span>日期范围</span>
      <span>${stats.dateRange}</span>
    </div>
  `;

  statsContent.innerHTML = html;
}

function renderMonthlyStats(stats) {
  const trendClass = stats.trend !== null && stats.trend < 0 ? 'down' : '';
  const trendText = stats.trend !== null
    ? (stats.trend >= 0 ? `↑ 比上月+${stats.trend}%` : `↓ 比上月${stats.trend}%`)
    : '（无上月数据）';

  let html = `
    <div class="stats-summary">
      <div class="stats-main-number">${stats.totalPomodoros}</div>
      <div class="stats-main-label">个番茄钟</div>
    </div>
    <div class="stats-detail-row">
      <span>总时长</span>
      <span>${formatDuration(stats.totalMinutes)}</span>
    </div>
    <div class="stats-detail-row">
      <span>日均</span>
      <span>${stats.avgPerDay} 个</span>
    </div>
    <div class="stats-detail-row">
      <span>本月趋势</span>
      <span class="stats-trend ${trendClass}">${trendText}</span>
    </div>
    <div class="stats-detail-row">
      <span>日期范围</span>
      <span>${stats.dateRange}</span>
    </div>
  `;

  statsContent.innerHTML = html;
}

async function updateStats() {
  if (currentStatsType === 'weekly') {
    const stats = await calculateWeeklyStats(currentPeriodOffset);
    statsPeriod.textContent = stats.period;
    renderWeeklyStats(stats);
  } else {
    const stats = await calculateMonthlyStats(currentPeriodOffset);
    statsPeriod.textContent = stats.period;
    renderMonthlyStats(stats);
  }
}

function openStats() {
  currentStatsType = 'weekly';
  currentPeriodOffset = 0;
  weeklyTab.classList.add('active');
  monthlyTab.classList.remove('active');
  prevPeriod.style.visibility = 'hidden';
  nextPeriod.style.visibility = 'visible';
  updateStats();
  statsModal.classList.remove('hidden');
}

function closeStats() {
  statsModal.classList.add('hidden');
}

// Event listeners
startBtn.addEventListener('click', startTimer);
resetBtn.addEventListener('click', resetTimer);
settingsBtn.addEventListener('click', openSettings);
saveSettingsBtn.addEventListener('click', saveSettings);
cancelSettingsBtn.addEventListener('click', closeSettings);
statsBtn.addEventListener('click', openStats);
closeStatsBtn.addEventListener('click', closeStats);

weeklyTab.addEventListener('click', () => {
  currentStatsType = 'weekly';
  currentPeriodOffset = 0;
  weeklyTab.classList.add('active');
  monthlyTab.classList.remove('active');
  prevPeriod.style.visibility = 'hidden';
  nextPeriod.style.visibility = 'visible';
  updateStats();
});

monthlyTab.addEventListener('click', () => {
  currentStatsType = 'monthly';
  currentPeriodOffset = 0;
  monthlyTab.classList.add('active');
  weeklyTab.classList.remove('active');
  prevPeriod.style.visibility = 'hidden';
  nextPeriod.style.visibility = 'visible';
  updateStats();
});

prevPeriod.addEventListener('click', () => {
  currentPeriodOffset--;
  prevPeriod.style.visibility = 'visible';
  nextPeriod.style.visibility = 'visible';
  updateStats();
});

nextPeriod.addEventListener('click', () => {
  currentPeriodOffset++;
  prevPeriod.style.visibility = 'visible';
  nextPeriod.style.visibility = currentPeriodOffset >= 0 ? 'hidden' : 'visible';
  updateStats();
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    closeSettings();
  }
});

statsModal.addEventListener('click', (e) => {
  if (e.target === statsModal) {
    closeStats();
  }
});

window.electronAPI.onTrayStart(() => {
  if (!isRunning) {
    startTimer();
  }
});

window.electronAPI.onTrayPause(() => {
  if (isRunning) {
    startTimer(); // toggle pause
  }
});

// Global shortcut: Ctrl+Shift+P to toggle timer
window.electronAPI.onShortcutToggle(() => {
  startTimer();
});