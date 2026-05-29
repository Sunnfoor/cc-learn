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
const cardBtn = document.getElementById('cardBtn');
const statsModal = document.getElementById('statsModal');
const weeklyTab = document.getElementById('weeklyTab');
const monthlyTab = document.getElementById('monthlyTab');
const prevPeriod = document.getElementById('prevPeriod');
const nextPeriod = document.getElementById('nextPeriod');
const statsPeriod = document.getElementById('statsPeriod');
const statsContent = document.getElementById('statsContent');
const closeStatsBtn = document.getElementById('closeStats');

const cardModal = document.getElementById('cardModal');
const cardCanvas = document.getElementById('cardCanvas');
const closeCardBtn = document.getElementById('closeCard');
const downloadCardBtn = document.getElementById('downloadCard');
const copyCardBtn = document.getElementById('copyCard');

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
    ? (stats.trend >= 0 ? `+${stats.trend}%` : `${stats.trend}%`)
    : '暂无数据';

  statsContent.innerHTML = `
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
}

function renderMonthlyStats(stats) {
  const trendClass = stats.trend !== null && stats.trend < 0 ? 'down' : '';
  const trendText = stats.trend !== null
    ? (stats.trend >= 0 ? `+${stats.trend}%` : `${stats.trend}%`)
    : '暂无数据';

  statsContent.innerHTML = `
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
cardBtn.addEventListener('click', showCardModal);
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

cardModal.addEventListener('click', (e) => {
  if (e.target === cardModal) {
    closeCard();
  }
});

closeCardBtn.addEventListener('click', closeCard);
downloadCardBtn.addEventListener('click', downloadCard);
copyCardBtn.addEventListener('click', copyCard);

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

// Card generation functions
function getDayName(dateStr) {
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const date = new Date(dateStr);
  return days[date.getDay()];
}

async function getTodayStats() {
  const sessions = await window.electronAPI.storeGet('sessions') || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.date === todayStr && s.type === 'work');
  const totalMinutes = todaySessions.reduce((sum, s) => sum + Math.round(s.duration / 60), 0);

  // Get week stats for progress bar
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekSessions = sessions.filter(s => {
    const d = new Date(s.date);
    return s.type === 'work' && d >= weekStart;
  });
  const weekTotal = weekSessions.length;

  return {
    date: todayStr,
    dateDisplay: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }),
    dayName: getDayName(todayStr),
    pomodorosCompleted: todaySessions.length,
    totalMinutes: totalMinutes,
    weekTotal: weekTotal
  };
}

// Hand-drawn style drawing helpers
function drawHandDrawnLine(ctx, x1, y1, x2, y2, wobble = 2) {
  ctx.beginPath();
  ctx.moveTo(x1 + (Math.random() - 0.5) * wobble, y1 + (Math.random() - 0.5) * wobble);

  const steps = 3;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * wobble;
    const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * wobble;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawHandDrawnRect(ctx, x, y, w, h, wobble = 2) {
  drawHandDrawnLine(ctx, x, y, x + w, y, wobble);
  drawHandDrawnLine(ctx, x + w, y, x + w, y + h, wobble);
  drawHandDrawnLine(ctx, x + w, y + h, x, y + h, wobble);
  drawHandDrawnLine(ctx, x, y + h, x, y, wobble);
}

function drawHandDrawnCircle(ctx, cx, cy, r, wobble = 2) {
  ctx.beginPath();
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const wobbleR = r + (Math.random() - 0.5) * wobble;
    const x = cx + Math.cos(angle) * wobbleR;
    const y = cy + Math.sin(angle) * wobbleR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

// Draw a cute hand-drawn tomato
function drawTomato(ctx, cx, cy, size) {
  const s = size / 100;

  // Tomato body
  ctx.fillStyle = '#e94560';
  ctx.strokeStyle = '#c73e54';
  ctx.lineWidth = 2 * s;

  ctx.beginPath();
  ctx.ellipse(cx, cy + 5 * s, 40 * s, 38 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tomato highlight (shine)
  ctx.fillStyle = 'rgba(255, 200, 200, 0.3)';
  ctx.beginPath();
  ctx.ellipse(cx - 12 * s, cy - 8 * s, 12 * s, 8 * s, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Leaves
  ctx.fillStyle = '#4a9960';
  ctx.strokeStyle = '#3d7a4f';
  ctx.lineWidth = 1.5 * s;

  // Left leaf
  ctx.beginPath();
  ctx.moveTo(cx, cy - 30 * s);
  ctx.bezierCurveTo(cx - 15 * s, cy - 45 * s, cx - 35 * s, cy - 40 * s, cx - 25 * s, cy - 25 * s);
  ctx.bezierCurveTo(cx - 30 * s, cy - 30 * s, cx - 20 * s, cy - 30 * s, cx, cy - 30 * s);
  ctx.fill();
  ctx.stroke();

  // Right leaf
  ctx.beginPath();
  ctx.moveTo(cx, cy - 30 * s);
  ctx.bezierCurveTo(cx + 15 * s, cy - 45 * s, cx + 35 * s, cy - 40 * s, cx + 25 * s, cy - 25 * s);
  ctx.bezierCurveTo(cx + 30 * s, cy - 30 * s, cx + 20 * s, cy - 30 * s, cx, cy - 30 * s);
  ctx.fill();
  ctx.stroke();

  // Stem
  ctx.fillStyle = '#3d7a4f';
  ctx.fillRect(cx - 3 * s, cy - 38 * s, 6 * s, 12 * s);

  // Face - cute eyes
  ctx.fillStyle = '#5a3040';
  ctx.beginPath();
  ctx.ellipse(cx - 12 * s, cy + 5 * s, 4 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 12 * s, cy + 5 * s, 4 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye highlights
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - 10 * s, cy + 3 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 14 * s, cy + 3 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Blush
  ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
  ctx.beginPath();
  ctx.ellipse(cx - 22 * s, cy + 15 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 22 * s, cy + 15 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#5a3040';
  ctx.lineWidth = 2 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + 12 * s, 10 * s, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

// Draw small decorative leaf
function drawLeaf(ctx, x, y, size, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#4a9960';
  ctx.strokeStyle = '#3d7a4f';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(size * 0.5, -size * 0.3, size, size * 0.3, 0, size);
  ctx.bezierCurveTo(-size * 0.5, size * 0.3, -size, -size * 0.3, 0, 0);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

// Add paper texture effect
function addPaperTexture(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

function renderCardToCanvas(canvas, stats) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Warm cream background
  ctx.fillStyle = '#fef9f3';
  ctx.fillRect(0, 0, width, height);

  // Paper texture
  addPaperTexture(ctx, width, height);

  // Top decorative line (hand-drawn style)
  ctx.strokeStyle = '#e8ddd4';
  ctx.lineWidth = 3;
  drawHandDrawnLine(ctx, 20, 25, width - 20, 25, 3);

  // Decorative leaves
  drawLeaf(ctx, 35, 35, 12, -0.5);
  drawLeaf(ctx, width - 35, 35, 12, 0.5);

  // Cute tomato illustration
  drawTomato(ctx, width / 2, 95, 120);

  // Title under tomato
  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('今天完成了', width / 2, 175);

  // Main pomodoro count
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(stats.pomodorosCompleted, width / 2, 225);

  ctx.fillStyle = '#5a5a5a';
  ctx.font = '16px Arial';
  ctx.fillText('个番茄钟', width / 2, 248);

  // Time box with hand-drawn border
  ctx.fillStyle = '#fff';
  drawHandDrawnRect(ctx, 60, 265, width - 120, 55, 3);
  ctx.fill();

  ctx.fillStyle = '#888';
  ctx.font = '11px Arial';
  ctx.fillText('今日专注时长', width / 2, 285);

  const hours = Math.floor(stats.totalMinutes / 60);
  const mins = stats.totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}小时${mins}分` : `${mins}分钟`;

  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 20px Arial';
  ctx.fillText(timeStr, width / 2, 308);

  // Week progress bar
  ctx.fillStyle = '#888';
  ctx.font = '11px Arial';
  ctx.fillText('本周进度', width / 2, 345);

  // Progress bar background
  const barWidth = width - 100;
  const barHeight = 8;
  const barX = 50;
  const barY = 355;

  ctx.fillStyle = '#ebe5de';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 4);
  ctx.fill();

  // Progress bar fill (max 20 pomodoros for full)
  const progress = Math.min(stats.weekTotal / 20, 1);
  if (progress > 0) {
    ctx.fillStyle = '#4a9960';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, 4);
    ctx.fill();
  }

  // Week count text
  ctx.fillStyle = '#5a5a5a';
  ctx.font = '12px Arial';
  ctx.fillText(`本周共 ${stats.weekTotal} 个番茄`, width / 2, 385);

  // Bottom decorative line
  ctx.strokeStyle = '#e8ddd4';
  ctx.lineWidth = 2;
  drawHandDrawnLine(ctx, 40, 400, width - 40, 400, 2);

  // Motivational quote
  ctx.fillStyle = '#c5a573';
  ctx.font = 'italic 13px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('"专注的时光，都是珍贵礼物"', width / 2, 422);

  // Date at bottom
  ctx.fillStyle = '#aaa';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(stats.dateDisplay + ' · ' + stats.dayName, width / 2, 445);

  // Bottom decorative elements - small flowers/dots
  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.arc(50, 455, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e94560';
  ctx.beginPath();
  ctx.arc(width / 2, 458, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#4a9960';
  ctx.beginPath();
  ctx.arc(width - 50, 455, 3, 0, Math.PI * 2);
  ctx.fill();
}

async function showCardModal() {
  const stats = await getTodayStats();
  renderCardToCanvas(cardCanvas, stats);
  cardModal.classList.remove('hidden');
  setTimeout(() => cardModal.classList.add('active'), 10);
}

function closeCard() {
  cardModal.classList.remove('active');
  setTimeout(() => {
    cardModal.classList.add('hidden');
  }, 300);
}

async function downloadCard() {
  const dataUrl = cardCanvas.toDataURL('image/png');
  await window.electronAPI.saveImage(dataUrl);
}

async function copyCard() {
  return new Promise((resolve, reject) => {
    cardCanvas.toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}