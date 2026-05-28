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

function switchState() {
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
  countDisplay.textContent = `已完成 ${Math.floor(pomodoroCount / 2)} 个番茄钟`;
  showNotification();
}

function showNotification() {
  const { showNotification } = require('./main.js');
  const messages = {
    'work': '开始工作！保持专注 💪',
    'shortBreak': '休息一下！☕',
    'longBreak': '长休息时间！🎉'
  };
  showNotification('番茄钟', messages[currentState]);
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

function saveSettings() {
  settings.workDuration = parseInt(workInput.value) || 25;
  settings.shortBreak = parseInt(shortBreakInput.value) || 5;
  settings.longBreak = parseInt(longBreakInput.value) || 15;

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

progressBar.style.strokeDasharray = CIRCUMFERENCE;
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