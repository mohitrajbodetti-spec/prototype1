/**
 * Main Application Logic & State Management
 * Student Budget Tracker with AI SMS & Category Sensor
 */

// Initial starter transactions to make the dashboard look rich and populated immediately
const INITIAL_TRANSACTIONS = [
  {
    id: 'txn_init_1',
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    merchant: 'Rajesh Sharma (Dad Allowance)',
    amount: 15000,
    currency: '₹',
    type: 'credit',
    category: 'income',
    categoryDetails: CATEGORIES.INCOME,
    source: 'sms_sensor',
    bank: 'HDFC Bank',
    paymentMode: 'UPI'
  },
  {
    id: 'txn_init_2',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    merchant: 'Ashok Kumar (PG Rent)',
    amount: 5500,
    currency: '₹',
    type: 'debit',
    category: 'housing',
    categoryDetails: CATEGORIES.HOUSING,
    source: 'sms_sensor',
    bank: 'HDFC Bank',
    paymentMode: 'UPI'
  },
  {
    id: 'txn_init_3',
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    merchant: 'Campus Book Depot',
    amount: 1250,
    currency: '₹',
    type: 'debit',
    category: 'academics',
    categoryDetails: CATEGORIES.ACADEMICS,
    source: 'sms_sensor',
    bank: 'SBI',
    paymentMode: 'Card'
  },
  {
    id: 'txn_init_4',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    merchant: 'Swiggy Food Delivery',
    amount: 380,
    currency: '₹',
    type: 'debit',
    category: 'food',
    categoryDetails: CATEGORIES.FOOD,
    source: 'sms_sensor',
    bank: 'HDFC Bank',
    paymentMode: 'UPI'
  },
  {
    id: 'txn_init_5',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    merchant: 'DMRC Metro Auto Topup',
    amount: 300,
    currency: '₹',
    type: 'debit',
    category: 'travel',
    categoryDetails: CATEGORIES.TRAVEL,
    source: 'sms_sensor',
    bank: 'ICICI Bank',
    paymentMode: 'UPI'
  },
  {
    id: 'txn_init_6',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    merchant: 'Campus Canteen',
    amount: 95,
    currency: '₹',
    type: 'debit',
    category: 'food',
    categoryDetails: CATEGORIES.FOOD,
    source: 'manual',
    bank: 'Cash / UPI',
    paymentMode: 'UPI'
  },
  {
    id: 'txn_init_7',
    date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    merchant: 'Netflix Subscription',
    amount: 199,
    currency: '₹',
    type: 'debit',
    category: 'entertainment',
    categoryDetails: CATEGORIES.ENTERTAINMENT,
    source: 'sms_sensor',
    bank: 'Axis Bank',
    paymentMode: 'Card'
  }
];

const INITIAL_CATEGORY_BUDGETS = {
  food: 3500,
  academics: 2500,
  housing: 6500,
  travel: 1200,
  entertainment: 1000,
  shopping: 1200,
  health: 800,
  utilities: 600,
  misc: 700
};

const INITIAL_SAVINGS_GOALS = [
  { id: 'goal_1', title: 'Laptop Upgrade Fund', target: 45000, current: 18500, icon: '💻', color: '#3b82f6' },
  { id: 'goal_2', title: 'Semester Trip with Friends', target: 6000, current: 4200, icon: '🏖️', color: '#10b981' },
  { id: 'goal_3', title: 'Emergency Cash Buffer', target: 5000, current: 3600, icon: '🛡️', color: '#f59e0b' }
];

const INITIAL_REMINDERS = [
  { id: 'rem_1', title: 'Hostel / PG Room Rent', amount: 5500, dueDate: '1st of every month', isCompleted: false, icon: '🏠', category: 'housing' },
  { id: 'rem_2', title: 'Wi-Fi & Mobile Recharge', amount: 299, dueDate: '15th of this month', isCompleted: false, icon: '⚡', category: 'utilities' },
  { id: 'rem_3', title: 'Semester Exam Registration Fee', amount: 1200, dueDate: '28th of this month', isCompleted: false, icon: '📚', category: 'academics' }
];

class AppState {
  constructor() {
    // 1. Detect active student profile from URL parameter: ?user=mohit or ?profile=mohit or ?login=mohit
    let userFromUrl = '';
    try {
      const urlParams = new URLSearchParams(window.location.search);
      userFromUrl = urlParams.get('user') || urlParams.get('profile') || urlParams.get('login') || '';
      if (userFromUrl) {
        userFromUrl = userFromUrl.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (userFromUrl) {
          localStorage.setItem('student_budget_active_user', userFromUrl);
        }
      }
    } catch (e) {}

    this.currentUser = (userFromUrl || localStorage.getItem('student_budget_active_user') || 'default').toLowerCase();
    this.storageKey = 'student_budget_state_' + this.currentUser;

    // Migrate old single-user storageKey if migrating default user
    if (this.currentUser === 'default' && !localStorage.getItem(this.storageKey)) {
      const oldState = localStorage.getItem('student_budget_tracker_state_v1');
      if (oldState) {
        localStorage.setItem(this.storageKey, oldState);
      }
    }

    // Keep registered profiles list
    this.profilesKey = 'student_budget_profiles_list';
    this.registeredProfiles = this.getRegisteredProfiles();
    if (!this.registeredProfiles.includes(this.currentUser)) {
      this.registeredProfiles.push(this.currentUser);
      localStorage.setItem(this.profilesKey, JSON.stringify(this.registeredProfiles));
    }

    this.loadState();
  }

  getRegisteredProfiles() {
    try {
      const p = localStorage.getItem('student_budget_profiles_list');
      if (p) return JSON.parse(p);
    } catch (e) {}
    return ['default'];
  }

  switchUser(name) {
    if (!name) return;
    const clean = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) return;
    localStorage.setItem('student_budget_active_user', clean);
    const profiles = this.getRegisteredProfiles();
    if (!profiles.includes(clean)) {
      profiles.push(clean);
      localStorage.setItem(this.profilesKey, JSON.stringify(profiles));
    }
    const url = new URL(window.location.href);
    url.searchParams.set('user', clean);
    window.location.href = url.toString();
  }

  loadState() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.transactions = parsed.transactions || INITIAL_TRANSACTIONS;
        this.monthlyAllowance = parsed.monthlyAllowance || 18000;
        this.startingBalance = parsed.startingBalance !== undefined ? parsed.startingBalance : 4500;
        this.budgets = parsed.budgets || INITIAL_CATEGORY_BUDGETS;
        this.savingsGoals = parsed.savingsGoals || INITIAL_SAVINGS_GOALS;
        this.reminders = parsed.reminders || INITIAL_REMINDERS;
        this.apiKey = parsed.apiKey || '';
        this.theme = parsed.theme || 'dark';
        return;
      } catch (e) {
        console.error('Error loading saved state:', e);
      }
    }

    // Default fallback
    this.transactions = [...INITIAL_TRANSACTIONS];
    this.monthlyAllowance = 18000;
    this.startingBalance = 4500;
    this.budgets = { ...INITIAL_CATEGORY_BUDGETS };
    this.savingsGoals = [...INITIAL_SAVINGS_GOALS];
    this.reminders = [...INITIAL_REMINDERS];
    this.apiKey = '';
    this.theme = 'dark';
    this.saveState();
  }

  saveState(skipRemoteSync = false) {
    const data = {
      transactions: this.transactions,
      monthlyAllowance: this.monthlyAllowance,
      startingBalance: this.startingBalance,
      budgets: this.budgets,
      savingsGoals: this.savingsGoals,
      reminders: this.reminders,
      apiKey: this.apiKey,
      theme: this.theme
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));

    // Debounced sync to Cloud Firestore for settings & budgets
    if (!skipRemoteSync && window.firestoreDb && window.firestoreDb.isInitialized) {
      if (this._fsDebounceTimer) clearTimeout(this._fsDebounceTimer);
      this._fsDebounceTimer = setTimeout(() => {
        window.firestoreDb.saveAppState(this);
      }, 600);
    }
  }

  resetToDefaults() {
    localStorage.removeItem(this.storageKey);
    this.loadState();
  }

  addTransaction(txn) {
    this.transactions.unshift(txn);
    this.saveState();
    if (window.firestoreDb && window.firestoreDb.isInitialized) {
      window.firestoreDb.saveTransaction(txn);
    }
  }

  deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveState();
    if (window.firestoreDb && window.firestoreDb.isInitialized) {
      window.firestoreDb.deleteTransaction(id);
    }
  }

  // --- Savings Goals Management ---
  addGoal(title, target, current = 0, icon = '🎯', color = '#6366f1') {
    if (!title || !target) return { success: false, message: 'Please provide both title and target amount for the goal.' };
    const numTarget = Math.max(1, parseFloat(target) || 1000);
    const numCurrent = Math.max(0, parseFloat(current) || 0);
    const existing = this.savingsGoals.find(g => g.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      existing.target = numTarget;
      if (current !== undefined && current !== 0) existing.current = numCurrent;
      this.saveState();
      return { success: true, goal: existing, message: `Updated target for goal **${existing.title}** to ₹${numTarget.toLocaleString('en-IN')}.` };
    }
    const newGoal = {
      id: 'goal_' + Date.now(),
      title: title.trim(),
      target: numTarget,
      current: numCurrent,
      icon: icon || '🎯',
      color: color || '#6366f1'
    };
    this.savingsGoals.push(newGoal);
    this.saveState();
    return { success: true, goal: newGoal, message: `Created new savings goal: **${newGoal.title}** (Target: ₹${numTarget.toLocaleString('en-IN')})!` };
  }

  setGoal(identifier, { target, current, addCurrent, title } = {}) {
    if (!identifier) return { success: false, message: 'Please specify which goal to update.' };
    const cleanId = String(identifier).toLowerCase().trim();
    const goal = this.savingsGoals.find(g => g.id === identifier || g.title.toLowerCase().includes(cleanId));
    if (!goal) return { success: false, message: `Could not find goal matching "${identifier}".` };
    
    if (target !== undefined && !isNaN(target)) {
      goal.target = Math.max(1, parseFloat(target));
    }
    if (current !== undefined && !isNaN(current)) {
      goal.current = Math.max(0, parseFloat(current));
    } else if (addCurrent !== undefined && !isNaN(addCurrent)) {
      goal.current = Math.max(0, goal.current + parseFloat(addCurrent));
    }
    if (title) goal.title = title.trim();

    this.saveState();
    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
    return {
      success: true,
      goal,
      message: `Updated **${goal.title}**: ₹${goal.current.toLocaleString('en-IN')} of ₹${goal.target.toLocaleString('en-IN')} (${pct}% complete).`
    };
  }

  removeGoal(identifier) {
    if (!identifier) return { success: false, message: 'Please specify which goal to remove.' };
    const cleanId = String(identifier).toLowerCase().trim();
    const idx = this.savingsGoals.findIndex(g => g.id === identifier || g.title.toLowerCase().includes(cleanId));
    if (idx === -1) return { success: false, message: `Could not find goal matching "${identifier}".` };
    const removed = this.savingsGoals.splice(idx, 1)[0];
    this.saveState();
    return { success: true, goal: removed, message: `Removed savings goal: **${removed.title}**.` };
  }

  // --- Reminders & Bill Alerts Management ---
  addReminder(title, amount = 0, dueDate = 'Upcoming', icon = '🔔', category = 'misc') {
    if (!title) return { success: false, message: 'Please provide a title or description for the reminder.' };
    const numAmt = parseFloat(amount) || 0;
    const newRem = {
      id: 'rem_' + Date.now(),
      title: title.trim(),
      amount: numAmt,
      dueDate: dueDate || 'Upcoming',
      isCompleted: false,
      icon: icon || '🔔',
      category: category || 'misc'
    };
    if (!this.reminders) this.reminders = [];
    this.reminders.push(newRem);
    this.saveState();
    return {
      success: true,
      reminder: newRem,
      message: `Added reminder: **${newRem.title}** ${numAmt > 0 ? `(₹${numAmt.toLocaleString('en-IN')})` : ''} due **${newRem.dueDate}**.`
    };
  }

  setReminder(identifier, { isCompleted, amount, dueDate, title } = {}) {
    if (!identifier) return { success: false, message: 'Please specify which reminder to update.' };
    const cleanId = String(identifier).toLowerCase().trim();
    if (!this.reminders) this.reminders = [];
    const rem = this.reminders.find(r => r.id === identifier || r.title.toLowerCase().includes(cleanId));
    if (!rem) return { success: false, message: `Could not find reminder matching "${identifier}".` };

    if (isCompleted !== undefined) rem.isCompleted = Boolean(isCompleted);
    if (amount !== undefined && !isNaN(amount)) rem.amount = parseFloat(amount);
    if (dueDate !== undefined) rem.dueDate = dueDate;
    if (title) rem.title = title.trim();

    this.saveState();
    return {
      success: true,
      reminder: rem,
      message: `Reminder **${rem.title}** is now ${rem.isCompleted ? '✅ Marked as Completed' : '⏳ Marked as Pending'}.`
    };
  }

  removeReminder(identifier) {
    if (!identifier) return { success: false, message: 'Please specify which reminder to remove.' };
    const cleanId = String(identifier).toLowerCase().trim();
    if (!this.reminders) this.reminders = [];
    const idx = this.reminders.findIndex(r => r.id === identifier || r.title.toLowerCase().includes(cleanId));
    if (idx === -1) return { success: false, message: `Could not find reminder matching "${identifier}".` };
    const removed = this.reminders.splice(idx, 1)[0];
    this.saveState();
    return { success: true, reminder: removed, message: `Removed reminder: **${removed.title}**.` };
  }

  getMetrics() {
    let totalIncome = 0;
    let totalSpent = 0;
    const categorySpends = {};

    Object.keys(CATEGORIES).forEach(k => {
      categorySpends[CATEGORIES[k].id] = 0;
    });

    this.transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'credit') {
        totalIncome += amt;
      } else {
        totalSpent += amt;
        const catId = t.category || 'misc';
        categorySpends[catId] = (categorySpends[catId] || 0) + amt;
      }
    });

    // Net account balance: starting balance + total income - total spent
    const totalBalance = this.startingBalance + totalIncome - totalSpent;
    const netSavings = Math.max(0, totalIncome - totalSpent);

    // Days remaining in month
    const now = new Date();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, totalDaysInMonth - now.getDate() + 1);

    // Remaining safe monthly budget
    const remainingAllowance = Math.max(0, (this.monthlyAllowance || totalIncome) - totalSpent);
    const dailySafeSpend = remainingAllowance / daysRemaining;

    return {
      totalBalance,
      totalIncome,
      totalSpent,
      netSavings,
      categorySpends,
      daysRemainingInMonth: daysRemaining,
      dailySafeSpend,
      monthlyAllowance: this.monthlyAllowance
    };
  }
}

// Global UI Controller
class UIController {
  constructor() {
    this.state = new AppState();
    this.currentSensedTxn = null;
    this.filterType = 'all';
    this.filterCategory = 'all';
    this.searchQuery = '';
    this.aiChatHistory = [];

    this.initTheme();
    this.initElements();
    this.bindEvents();
    this.initGateway();
    this.initNotificationListener();
    this.initFirestore();
    this.updateGeminiModeIndicator();
    this.render();
  }

  initTheme() {
    document.documentElement.setAttribute('data-theme', this.state.theme);
    // Clear any previous zoom overrides from document body and storage
    document.body.style.zoom = '';
    document.documentElement.style.removeProperty('--app-zoom');
    localStorage.removeItem('budget_tracker_zoom');
    localStorage.removeItem('budget_table_zoom');
  }

  toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.state.saveState();
    this.initTheme();
    const icon = document.getElementById('themeToggleBtn');
    if (icon) {
      icon.innerHTML = this.state.theme === 'dark' ? '☀️' : '🌙';
    }
  }

  initElements() {
    // Top Bar Metrics
    this.elTotalBalance = document.getElementById('totalBalanceVal');
    this.elMonthlyIncome = document.getElementById('monthlyIncomeVal');
    this.elTotalSpent = document.getElementById('totalSpentVal');
    this.elDailySafe = document.getElementById('dailySafeVal');
    this.elDaysLeftTag = document.getElementById('daysLeftTag');

    // SMS Sensor Elements
    this.elSmsInput = document.getElementById('smsSensorInput');
    this.elSmsPresetContainer = document.getElementById('smsPresetPills');
    this.elSensedPreview = document.getElementById('sensedResultCard');
    this.elConfirmTxnBtn = document.getElementById('confirmSensedTxnBtn');
    this.elClearSmsBtn = document.getElementById('clearSmsBtn');

    // Category Sensor Real-Time Indicators
    this.elCatSensorBadge = document.getElementById('catSensorBadge');
    this.elCatSensorConfidence = document.getElementById('catSensorConfidence');
    this.elCatSensorReason = document.getElementById('catSensorReason');

    // Screenshot & Receipt Sensor Elements
    this.tabModeSms = document.getElementById('tabModeSms');
    this.tabModeScreenshot = document.getElementById('tabModeScreenshot');
    this.smsTabContent = document.getElementById('smsSensorTabContent');
    this.screenshotTabContent = document.getElementById('screenshotSensorTabContent');
    this.screenshotDropzone = document.getElementById('screenshotDropzone');
    this.screenshotFileInput = document.getElementById('screenshotFileInput');
    this.browseScreenshotBtn = document.getElementById('browseScreenshotBtn');
    this.scannerActiveBox = document.getElementById('scannerActiveBox');
    this.scannerThumbImg = document.getElementById('scannerThumbImg');
    this.scannerStatusMsg = document.getElementById('scannerStatusMsg');
    this.scannerProgressFill = document.getElementById('scannerProgressFill');
    this.sensedAppBadge = document.getElementById('sensedAppBadge');

    // AI Reaction Banner
    this.elAiReactionCard = document.getElementById('aiReactionCard');

    // Ledger & Modals
    this.elTxnTableBody = document.getElementById('txnTableBody');
    this.elTxnTableFoot = document.getElementById('txnTableFoot');
    this.elTxnSearchInput = document.getElementById('txnSearchInput');
    this.elTxnTypeFilter = document.getElementById('txnTypeFilter');
    this.elTxnCatFilter = document.getElementById('txnCatFilter');
    this.ledgerTotalNetAmt = document.getElementById('ledgerTotalNetAmt');
    this.ledgerTotalDebitsBadge = document.getElementById('ledgerTotalDebitsBadge');
    this.ledgerTotalCreditsBadge = document.getElementById('ledgerTotalCreditsBadge');
    this.ledgerFilterStats = document.getElementById('ledgerFilterStats');

    // Gemini AI Coach Elements
    this.elAiChatMessages = document.getElementById('aiChatMessages');
    this.elAiChatInput = document.getElementById('aiChatInput');
    this.elAiChatSendBtn = document.getElementById('aiChatSendBtn');
    this.openGeminiBotBtn = document.getElementById('openGeminiBotBtn');
    this.btnGetSavingSuggestions = document.getElementById('btnGetSavingSuggestions');
    this.openGeminiKeyModalBtn = document.getElementById('openGeminiKeyModalBtn');
    this.geminiModeIndicator = document.getElementById('geminiModeIndicator');

    // FinArt & SMS Gateway Elements
    this.openGatewayBtn = document.getElementById('openGatewayBtn');
    this.closeGatewayBtn = document.getElementById('closeGatewayBtn');
    this.gatewayModal = document.getElementById('gatewayModal');
    this.gatewayStatusText = document.getElementById('gatewayStatusText');
    this.gwLocalUrl = document.getElementById('gwLocalUrl');
    this.gwLanUrl = document.getElementById('gwLanUrl');
    this.gwApiKeyInput = document.getElementById('gwApiKeyInput');
    this.gwRemoteEndpointInput = document.getElementById('gwRemoteEndpointInput');
    this.gwAutoSyncToggle = document.getElementById('gwAutoSyncToggle');
    this.gwAutoConfirmToggle = document.getElementById('gwAutoConfirmToggle');
    this.gatewaySettingsForm = document.getElementById('gatewaySettingsForm');
    this.gwSimulateBtn = document.getElementById('gwSimulateBtn');
    this.gwClearLogBtn = document.getElementById('gwClearLogBtn');
    this.gwActivityLogContainer = document.getElementById('gwActivityLogContainer');
    this.gatewayToastContainer = document.getElementById('gatewayToastContainer');

    // Android Notification Listener Elements
    this.openNotificationBtn = document.getElementById('openNotificationBtn');
    this.closeNotificationBtn = document.getElementById('closeNotificationBtn');
    this.notificationModal = document.getElementById('notificationModal');
    this.notifStatusText = document.getElementById('notifStatusText');
    this.notifLanUrl = document.getElementById('notifLanUrl');
    this.notifLocalUrl = document.getElementById('notifLocalUrl');
    this.notifActivityLogContainer = document.getElementById('notifActivityLogContainer');
    this.btnClearNotifFeed = document.getElementById('btnClearNotifFeed');
    this.customNotifInput = document.getElementById('customNotifInput');
    this.btnSendCustomNotif = document.getElementById('btnSendCustomNotif');
    this.notifAutoSyncToggle = document.getElementById('notifAutoSyncToggle');
    this.notifAutoConfirmToggle = document.getElementById('notifAutoConfirmToggle');
  }

  bindEvents() {
    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Tab Switching (SMS vs Screenshot)
    if (this.tabModeSms && this.tabModeScreenshot) {
      this.tabModeSms.addEventListener('click', () => this.switchSensorTab('sms'));
      this.tabModeScreenshot.addEventListener('click', () => this.switchSensorTab('screenshot'));
    }

    // Screenshot File Browse
    if (this.browseScreenshotBtn && this.screenshotFileInput) {
      this.browseScreenshotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.screenshotFileInput.click();
      });
    }

    if (this.screenshotDropzone && this.screenshotFileInput) {
      this.screenshotDropzone.addEventListener('click', () => {
        this.screenshotFileInput.click();
      });

      // Drag & Drop handlers
      this.screenshotDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.screenshotDropzone.classList.add('dragover');
      });

      this.screenshotDropzone.addEventListener('dragleave', () => {
        this.screenshotDropzone.classList.remove('dragover');
      });

      this.screenshotDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        this.screenshotDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          this.handleScreenshotFile(file);
        }
      });

      this.screenshotFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleScreenshotFile(e.target.files[0]);
        }
      });
    }

    // Global Clipboard Paste Listener (Ctrl + V anywhere)
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || window.clipboardData)?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
              this.switchSensorTab('screenshot');
              this.handleScreenshotFile(blob);
              this.showToast('📋 Screenshot detected from clipboard!');
              break;
            }
          }
        }
      }
    });

    // 1-Click Screenshot Preset Buttons (PhonePe, GPay, Paytm)
    document.querySelectorAll('.ss-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (typeof ScreenshotAnalyzer !== 'undefined') {
          const dataUrl = ScreenshotAnalyzer.generateSampleScreenshotCanvas(type);
          this.handleScreenshotDataUrl(dataUrl, type);
        }
      });
    });

    // SMS Input Live Sense Listener
    if (this.elSmsInput) {
      this.elSmsInput.addEventListener('input', () => this.handleSmsInputLive());
    }

    // Confirm Sensed Transaction Button
    if (this.elConfirmTxnBtn) {
      this.elConfirmTxnBtn.addEventListener('click', () => this.confirmSensedTransaction());
    }

    // Clear SMS Button
    if (this.elClearSmsBtn) {
      this.elClearSmsBtn.addEventListener('click', () => {
        this.elSmsInput.value = '';
        this.currentSensedTxn = null;
        this.elSensedPreview.classList.add('hidden');
      });
    }

    // Populate Student SMS Preset Buttons
    this.renderSmsPresets();

    // Ledger Filters
    if (this.elTxnSearchInput) {
      this.elTxnSearchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderTransactions();
      });
    }

    if (this.elTxnTypeFilter) {
      this.elTxnTypeFilter.addEventListener('change', (e) => {
        this.filterType = e.target.value;
        this.renderTransactions();
      });
    }

    if (this.elTxnCatFilter) {
      this.elTxnCatFilter.addEventListener('change', (e) => {
        this.filterCategory = e.target.value;
        this.renderTransactions();
      });
    }

    // Manual Transaction Modal
    const openAddModalBtn = document.getElementById('openAddModalBtn');
    const closeAddModalBtn = document.getElementById('closeAddModalBtn');
    const addTxnModal = document.getElementById('addTxnModal');
    const addTxnForm = document.getElementById('addTxnForm');

    if (openAddModalBtn && addTxnModal) {
      openAddModalBtn.addEventListener('click', () => {
        addTxnModal.classList.remove('hidden');
      });
    }

    if (closeAddModalBtn && addTxnModal) {
      closeAddModalBtn.addEventListener('click', () => {
        addTxnModal.classList.add('hidden');
      });
    }

    if (addTxnForm) {
      addTxnForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleManualAdd(addTxnForm);
        addTxnModal.classList.add('hidden');
        addTxnForm.reset();
      });
    }

    // Settings Modal
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');
    const resetDataBtn = document.getElementById('resetDataBtn');

    if (openSettingsBtn && settingsModal) {
      openSettingsBtn.addEventListener('click', () => {
        document.getElementById('settingsAllowanceInput').value = this.state.monthlyAllowance;
        document.getElementById('settingsBalanceInput').value = this.state.startingBalance;
        document.getElementById('settingsApiKeyInput').value = this.state.apiKey;
        settingsModal.classList.remove('hidden');
      });
    }

    if (closeSettingsBtn && settingsModal) {
      closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
      });
    }

    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.state.monthlyAllowance = parseFloat(document.getElementById('settingsAllowanceInput').value) || 18000;
        this.state.startingBalance = parseFloat(document.getElementById('settingsBalanceInput').value) || 0;
        this.state.apiKey = document.getElementById('settingsApiKeyInput').value.trim();
        this.state.saveState();
        settingsModal.classList.add('hidden');
        this.render();
        this.showToast('Settings updated successfully!');
      });
    }

    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => {
        if (confirm('Reset to initial sample student budget data?')) {
          this.state.resetToDefaults();
          settingsModal.classList.add('hidden');
          this.render();
          this.showToast('Reset to default sample data.');
        }
      });
    }

    // FinArt & SMS Gateway Modal Events
    if (this.openGatewayBtn && this.gatewayModal) {
      this.openGatewayBtn.addEventListener('click', () => {
        this.openGatewayModal();
      });
    }

    if (this.closeGatewayBtn && this.gatewayModal) {
      this.closeGatewayBtn.addEventListener('click', () => {
        this.gatewayModal.classList.add('hidden');
      });
    }

    // Copy Webhook URL buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input && input.value) {
          navigator.clipboard.writeText(input.value).then(() => {
            const orig = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => { btn.textContent = orig; }, 2000);
            this.showToast('📋 Webhook URL copied to clipboard!');
          }).catch(() => {
            input.select();
            document.execCommand('copy');
            this.showToast('📋 Webhook URL copied to clipboard!');
          });
        }
      });
    });

    // Gateway settings form submission
    if (this.gatewaySettingsForm) {
      this.gatewaySettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (window.finartGateway) {
          window.finartGateway.saveConfig({
            apiKey: this.gwApiKeyInput.value.trim(),
            remoteEndpoint: this.gwRemoteEndpointInput.value.trim(),
            autoSync: this.gwAutoSyncToggle.checked,
            autoConfirm: this.gwAutoConfirmToggle.checked
          });
          this.showToast('✅ Gateway & FinArt settings saved!');
          this.refreshGatewayInfo();
        }
      });
    }

    // Simulate SMS button inside Gateway Modal
    if (this.gwSimulateBtn) {
      this.gwSimulateBtn.addEventListener('click', async () => {
        this.gwSimulateBtn.disabled = true;
        this.gwSimulateBtn.textContent = '⏳ Sending...';
        if (window.finartGateway) {
          const res = await window.finartGateway.triggerSimulatorTest();
          if (res && res.success) {
            this.showToast('⚡ Simulated bank SMS sent to gateway!');
          }
        }
        setTimeout(() => {
          this.gwSimulateBtn.disabled = false;
          this.gwSimulateBtn.textContent = '⚡ Send Test Bank SMS';
        }, 1000);
      });
    }

    // Clear activity feed button
    if (this.gwClearLogBtn) {
      this.gwClearLogBtn.addEventListener('click', async () => {
        if (window.finartGateway) {
          await window.finartGateway.clearQueues();
          if (this.gwActivityLogContainer) {
            this.gwActivityLogContainer.innerHTML = '<div class="gateway-log-empty">Gateway feed cleared. Waiting for new SMS...</div>';
          }
          this.showToast('Gateway feed cleared');
        }
      });
    }

    // Gemini AI Coach Events
    if (this.openGeminiBotBtn) {
      this.openGeminiBotBtn.addEventListener('click', () => {
        const botCard = document.getElementById('geminiBotSection');
        if (botCard) {
          botCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (this.elAiChatInput) this.elAiChatInput.focus();
        }
      });
    }

    if (this.btnGetSavingSuggestions) {
      this.btnGetSavingSuggestions.addEventListener('click', () => {
        this.appendAiChatMessage('user', '💡 Give me personalized student savings suggestions');
        const metrics = this.state.getMetrics();
        const fullContext = {
          ...metrics,
          budgets: this.state.budgets,
          savingsGoals: this.state.savingsGoals,
          reminders: this.state.reminders,
          transactions: this.state.transactions,
          appState: this.state
        };
        const advice = AiAdvisor.generatePersonalizedSavingsAdvice(fullContext);
        this.appendAiChatMessage('assistant', advice);
      });
    }

    // Quick Add Goal Button
    const btnAddGoalQuick = document.getElementById('btnAddGoalQuick');
    if (btnAddGoalQuick) {
      btnAddGoalQuick.addEventListener('click', () => {
        const title = prompt('Enter Savings Goal title (e.g. "Tech Fund", "Semester Trip"):');
        if (!title || !title.trim()) return;
        const targetStr = prompt(`Enter target amount in ₹ for "${title.trim()}":`, '10000');
        if (!targetStr) return;
        const target = parseFloat(targetStr);
        if (isNaN(target) || target <= 0) {
          alert('Please enter a valid target amount.');
          return;
        }
        const currentStr = prompt('Enter current savings already saved (optional, defaults to 0):', '0');
        const current = parseFloat(currentStr) || 0;
        const res = this.state.addGoal(title.trim(), target, current);
        this.render();
        this.showToast(res.message.replace(/\*\*/g, ''));
      });
    }

    // Quick Add Reminder Button
    const btnAddReminderQuick = document.getElementById('btnAddReminderQuick');
    if (btnAddReminderQuick) {
      btnAddReminderQuick.addEventListener('click', () => {
        const title = prompt('Enter Reminder / Bill title (e.g. "Hostel Rent", "Wi-Fi Recharge"):');
        if (!title || !title.trim()) return;
        const amountStr = prompt(`Enter amount in ₹ for "${title.trim()}":`, '1000');
        const amount = parseFloat(amountStr) || 0;
        const dueDate = prompt('Enter due date (e.g. "1st of month", "15th", "Next Monday"):', 'Upcoming') || 'Upcoming';
        const res = this.state.addReminder(title.trim(), amount, dueDate);
        this.render();
        this.showToast(res.message.replace(/\*\*/g, ''));
      });
    }

    // Savings Goals List Event Delegation (delete & deposit)
    const goalsContainer = document.getElementById('savingsGoalsList');
    if (goalsContainer) {
      goalsContainer.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-delete-goal');
        if (delBtn) {
          const id = delBtn.getAttribute('data-goal-id');
          if (id && confirm('Delete this savings goal?')) {
            const res = this.state.removeGoal(id);
            this.render();
            this.showToast(res.message.replace(/\*\*/g, ''));
          }
          return;
        }

        const depositBtn = e.target.closest('.btn-deposit-goal');
        if (depositBtn) {
          const id = depositBtn.getAttribute('data-goal-id');
          const addAmt = parseFloat(depositBtn.getAttribute('data-add')) || 500;
          if (id) {
            const res = this.state.setGoal(id, { addCurrent: addAmt });
            this.render();
            this.showToast(res.message.replace(/\*\*/g, ''));
          }
        }
      });
    }

    // Reminders List Event Delegation (toggle completion & delete)
    const remindersContainer = document.getElementById('remindersList');
    if (remindersContainer) {
      remindersContainer.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.btn-delete-reminder');
        if (delBtn) {
          const id = delBtn.getAttribute('data-rem-id');
          if (id && confirm('Delete this reminder?')) {
            const res = this.state.removeReminder(id);
            this.render();
            this.showToast(res.message.replace(/\*\*/g, ''));
          }
          return;
        }

        const toggleBtn = e.target.closest('.btn-toggle-reminder');
        if (toggleBtn) {
          const id = toggleBtn.getAttribute('data-rem-id');
          const rem = (this.state.reminders || []).find(r => r.id === id);
          if (rem) {
            const res = this.state.setReminder(id, { isCompleted: !rem.isCompleted });
            this.render();
            this.showToast(res.message.replace(/\*\*/g, ''));
          }
        }
      });
    }

    if (this.openGeminiKeyModalBtn) {
      this.openGeminiKeyModalBtn.addEventListener('click', () => {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
          settingsModal.classList.remove('hidden');
          const keyInput = document.getElementById('settingsApiKeyInput');
          if (keyInput) keyInput.focus();
        }
      });
    }

    // AI Chat Events
    if (this.elAiChatSendBtn && this.elAiChatInput) {
      this.elAiChatSendBtn.addEventListener('click', () => this.handleAiChatSubmit());
      this.elAiChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleAiChatSubmit();
        }
      });
    }

    // Quick AI prompt pills
    document.querySelectorAll('.ai-prompt-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.getAttribute('data-query');
        if (query && this.elAiChatInput) {
          this.elAiChatInput.value = query;
          this.handleAiChatSubmit();
        }
      });
    });

    // Android Notification Listener Modal Events
    if (this.openNotificationBtn && this.notificationModal) {
      this.openNotificationBtn.addEventListener('click', () => {
        this.openNotificationModal();
      });
    }

    if (this.closeNotificationBtn && this.notificationModal) {
      this.closeNotificationBtn.addEventListener('click', () => {
        this.notificationModal.classList.add('hidden');
      });
    }

    // Share on WhatsApp & Mobile Modal Events
    const openShareModalBtn = document.getElementById('openShareModalBtn');
    const shareModal = document.getElementById('shareModal');
    const closeShareModalBtn = document.getElementById('closeShareModalBtn');
    const copyPublicLinkBtn = document.getElementById('copyPublicLinkBtn');
    const copyLanLinkBtn = document.getElementById('copyLanLinkBtn');

    if (openShareModalBtn && shareModal) {
      openShareModalBtn.addEventListener('click', () => {
        shareModal.classList.remove('hidden');
      });
    }

    if (closeShareModalBtn && shareModal) {
      closeShareModalBtn.addEventListener('click', () => {
        shareModal.classList.add('hidden');
      });
    }

    if (copyPublicLinkBtn) {
      copyPublicLinkBtn.addEventListener('click', () => {
        const input = document.getElementById('sharePublicUrlInput');
        if (input) {
          navigator.clipboard.writeText(input.value);
          this.showToast('📋 Public link copied to clipboard!');
        }
      });
    }

    if (copyLanLinkBtn) {
      copyLanLinkBtn.addEventListener('click', () => {
        const input = document.getElementById('shareLanUrlInput');
        if (input) {
          navigator.clipboard.writeText(input.value);
          this.showToast('📶 Wi-Fi network link copied to clipboard!');
        }
      });
    }

    const copyLocalLinkBtn = document.getElementById('copyLocalLinkBtn');
    if (copyLocalLinkBtn) {
      copyLocalLinkBtn.addEventListener('click', () => {
        const input = document.getElementById('shareLocalUrlInput');
        if (input) {
          navigator.clipboard.writeText(input.value);
          this.showToast('💻 Local PC link copied to clipboard!');
        }
      });
    }

    // Student Profile & Multiple-Time Login Modal Events
    const openProfileBtn = document.getElementById('openProfileBtn');
    const profileModal = document.getElementById('profileModal');
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    const copyMyLoginLinkBtn = document.getElementById('copyMyLoginLinkBtn');
    const copyMyLanLoginLinkBtn = document.getElementById('copyMyLanLoginLinkBtn');
    const addNewProfileBtn = document.getElementById('addNewProfileBtn');
    const newProfileNameInput = document.getElementById('newProfileNameInput');

    if (openProfileBtn && profileModal) {
      openProfileBtn.addEventListener('click', () => {
        this.renderProfileModal();
        profileModal.classList.remove('hidden');
      });
    }

    if (closeProfileBtn && profileModal) {
      closeProfileBtn.addEventListener('click', () => {
        profileModal.classList.add('hidden');
      });
    }

    if (profileModal) {
      profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) {
          profileModal.classList.add('hidden');
        }
      });
    }

    if (copyMyLoginLinkBtn) {
      copyMyLoginLinkBtn.addEventListener('click', () => {
        const input = document.getElementById('myLoginLinkInput');
        if (input && input.value) {
          navigator.clipboard.writeText(input.value);
          this.showToast('🌐 Public multiple-time login link copied! Click or bookmark anytime.');
        }
      });
    }

    if (copyMyLanLoginLinkBtn) {
      copyMyLanLoginLinkBtn.addEventListener('click', () => {
        const input = document.getElementById('myLanLoginLinkInput');
        if (input && input.value) {
          navigator.clipboard.writeText(input.value);
          this.showToast('📶 Wi-Fi login link copied!');
        }
      });
    }

    if (addNewProfileBtn && newProfileNameInput) {
      const handleAddProfile = () => {
        const name = newProfileNameInput.value.trim();
        if (!name) {
          this.showToast('⚠️ Please enter a student or account name.');
          return;
        }
        this.state.switchUser(name);
      };

      addNewProfileBtn.addEventListener('click', handleAddProfile);
      newProfileNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddProfile();
        }
      });
    }

    // Notification Hub Tabs
    document.querySelectorAll('.notif-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        document.querySelectorAll('.notif-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.notif-tab-content').forEach(c => c.classList.add('hidden'));
        btn.classList.add('active');
        const pane = document.getElementById(target);
        if (pane) pane.classList.remove('hidden');
      });
    });

    // 1-Click Simulator cards in Android Notification Listener Hub
    document.querySelectorAll('.sim-card-btn').forEach(card => {
      card.addEventListener('click', async () => {
        const idx = parseInt(card.getAttribute('data-sim-index'), 10);
        card.style.transform = 'scale(0.96)';
        setTimeout(() => { card.style.transform = ''; }, 150);

        if (window.notificationListener) {
          const res = await window.notificationListener.triggerSimulatorTest(idx);
          if (res && res.success && res.entry) {
            this.showToast(`⚡ FinArt intercepted: ${res.entry.appName || 'Push'} alert categorized!`);
          } else {
            this.showToast('⚡ Injected simulated push notification!');
          }
        }
      });
    });

    // Custom notification test injector
    if (this.btnSendCustomNotif && this.customNotifInput) {
      this.btnSendCustomNotif.addEventListener('click', async () => {
        const text = this.customNotifInput.value.trim();
        if (!text) {
          this.showToast('⚠️ Please enter notification text.');
          return;
        }
        if (window.notificationListener) {
          await window.notificationListener.triggerSimulatorTest({ text });
          this.customNotifInput.value = '';
          this.showToast('⚡ Custom notification intercepted & categorized by FinArt!');
        }
      });
    }

    // Clear notification log feed
    if (this.btnClearNotifFeed) {
      this.btnClearNotifFeed.addEventListener('click', async () => {
        if (window.notificationListener) {
          await window.notificationListener.clearQueues();
          if (this.notifActivityLogContainer) {
            this.notifActivityLogContainer.innerHTML = '<div class="gateway-log-empty">Notification feed cleared.</div>';
          }
          this.showToast('Notification feed cleared');
        }
      });
    }

    // Notification toggles
    if (this.notifAutoSyncToggle) {
      this.notifAutoSyncToggle.addEventListener('change', () => {
        if (window.notificationListener) {
          window.notificationListener.saveConfig({ autoSync: this.notifAutoSyncToggle.checked });
        }
      });
    }

    if (this.notifAutoConfirmToggle) {
      this.notifAutoConfirmToggle.addEventListener('change', () => {
        if (window.notificationListener) {
          window.notificationListener.saveConfig({ autoConfirm: this.notifAutoConfirmToggle.checked });
        }
      });
    }

    // Category Sensor Sandbox Tester
    const catTesterInput = document.getElementById('catTesterInput');
    const catTesterBtn = document.getElementById('catTesterBtn');
    const catTesterResult = document.getElementById('catTesterResult');

    if (catTesterInput && catTesterBtn && catTesterResult) {
      const runTest = () => {
        const text = catTesterInput.value.trim();
        if (!text) return;
        const res = SmsSensorEngine.senseCategory(text, text);
        catTesterResult.innerHTML = `
          <div class="sensor-test-badge" style="background:${res.details.bg}; border-color:${res.details.color}; color:${res.details.color};">
            <span class="icon">${res.details.icon}</span>
            <strong>${res.details.name}</strong>
            <span class="confidence-pill">${res.confidence}% Confidence</span>
          </div>
          <div class="sensor-reasoning">💡 ${res.reasoning}</div>
        `;
      };
      catTesterBtn.addEventListener('click', runTest);
      catTesterInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runTest(); });
    }
  }

  renderSmsPresets() {
    if (!this.elSmsPresetContainer) return;
    this.elSmsPresetContainer.innerHTML = STUDENT_SMS_PRESETS.map((p, idx) => `
      <button type="button" class="preset-pill" data-idx="${idx}">
        ${p.title}
      </button>
    `).join('');

    this.elSmsPresetContainer.querySelectorAll('.preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const preset = STUDENT_SMS_PRESETS[idx];
        if (preset && this.elSmsInput) {
          this.elSmsInput.value = preset.sms;
          this.handleSmsInputLive();
          this.elSmsInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  switchSensorTab(tab) {
    if (tab === 'sms') {
      if (this.tabModeSms) this.tabModeSms.classList.add('active');
      if (this.tabModeScreenshot) this.tabModeScreenshot.classList.remove('active');
      if (this.smsTabContent) this.smsTabContent.classList.remove('hidden');
      if (this.screenshotTabContent) this.screenshotTabContent.classList.add('hidden');
    } else {
      if (this.tabModeScreenshot) this.tabModeScreenshot.classList.add('active');
      if (this.tabModeSms) this.tabModeSms.classList.remove('active');
      if (this.screenshotTabContent) this.screenshotTabContent.classList.remove('hidden');
      if (this.smsTabContent) this.smsTabContent.classList.add('hidden');
    }
  }

  handleScreenshotFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.showToast('⚠️ Please upload a valid image file (PNG, JPG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      this.handleScreenshotDataUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async handleScreenshotDataUrl(dataUrl, simulatedType = null) {
    if (!dataUrl) return;

    // 1. Show active scanner box with thumbnail and laser animation
    if (this.scannerActiveBox && this.scannerThumbImg) {
      this.scannerActiveBox.classList.remove('hidden');
      this.scannerThumbImg.src = dataUrl;
      this.scannerActiveBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (this.scannerStatusMsg) this.scannerStatusMsg.textContent = 'Analyzing screenshot with AI OCR...';
    if (this.scannerProgressFill) this.scannerProgressFill.style.width = '35%';

    try {
      // 2. Call ScreenshotAnalyzer
      const sensed = await ScreenshotAnalyzer.processImage(dataUrl, this.state.apiKey, (prog) => {
        if (this.scannerStatusMsg) this.scannerStatusMsg.textContent = prog.message;
        if (this.scannerProgressFill) this.scannerProgressFill.style.width = `${prog.pct}%`;
      });

      // If simulated type was explicitly clicked, enhance payment app details
      if (simulatedType === 'phonepe') {
        sensed.paymentApp = 'PhonePe';
        sensed.paymentMode = 'PhonePe UPI';
        sensed.amount = 380;
        sensed.formattedAmount = '₹380.00';
        sensed.merchant = 'Swiggy Food Delivery';
        sensed.category = 'food';
        sensed.categoryDetails = CATEGORIES.FOOD;
        sensed.reasoning = 'Detected PhonePe receipt to Swiggy Food Delivery';
        sensed.confidence = 99;
      } else if (simulatedType === 'gpay') {
        sensed.paymentApp = 'Google Pay';
        sensed.paymentMode = 'Google Pay';
        sensed.amount = 75;
        sensed.formattedAmount = '₹75.00';
        sensed.merchant = 'Campus Canteen';
        sensed.category = 'food';
        sensed.categoryDetails = CATEGORIES.FOOD;
        sensed.reasoning = 'Detected Google Pay receipt to Campus Canteen';
        sensed.confidence = 99;
      } else if (simulatedType === 'paytm') {
        sensed.paymentApp = 'Paytm';
        sensed.paymentMode = 'Paytm Payments';
        sensed.amount = 1450;
        sensed.formattedAmount = '₹1,450.00';
        sensed.merchant = 'Campus Book Depot';
        sensed.category = 'academics';
        sensed.categoryDetails = CATEGORIES.ACADEMICS;
        sensed.reasoning = 'Detected Paytm receipt to Campus Book Depot';
        sensed.confidence = 99;
      }

      this.currentSensedTxn = sensed;

      // 3. Render Preview Box
      if (this.elSensedPreview) {
        this.elSensedPreview.classList.remove('hidden');
      }

      const cat = sensed.categoryDetails || CATEGORIES.MISC;

      // Update Type Tag
      const typeTag = document.getElementById('sensedTypeTag');
      if (typeTag) {
        typeTag.textContent = '🛒 Outflow / Payment Sensed';
        typeTag.className = 'status-pill pill-debit';
      }

      // Show Payment App Badge
      if (this.sensedAppBadge) {
        const app = ScreenshotAnalyzer.detectPaymentApp(sensed.paymentApp || sensed.rawText || '');
        this.sensedAppBadge.textContent = `${app.icon} ${sensed.paymentApp || app.name}`;
        this.sensedAppBadge.className = `app-badge-pill ${app.badgeClass}`;
        this.sensedAppBadge.classList.remove('hidden');
      }

      const amtVal = document.getElementById('sensedAmountVal');
      if (amtVal) {
        amtVal.textContent = sensed.formattedAmount;
        amtVal.className = 'val text-debit';
      }

      const merchVal = document.getElementById('sensedMerchantVal');
      if (merchVal) {
        merchVal.textContent = sensed.merchant;
      }

      const catBadge = document.getElementById('sensedCategoryBadge');
      if (catBadge) {
        catBadge.innerHTML = `<span class="cat-icon">${cat.icon}</span> <span>${cat.name}</span>`;
        catBadge.style.backgroundColor = cat.bg;
        catBadge.style.color = cat.color;
      }

      const confVal = document.getElementById('sensedConfidencePct');
      if (confVal) confVal.textContent = `${sensed.confidence}% AI Confidence`;

      const reasonVal = document.getElementById('sensedReasonText');
      if (reasonVal) reasonVal.textContent = sensed.reasoning;

      const balRow = document.getElementById('sensedBalanceRow');
      if (balRow) balRow.classList.add('hidden'); // Screenshots don't always show Avl Bal

      // Alternatives
      const altContainer = document.getElementById('sensedAltCategories');
      if (altContainer) {
        altContainer.innerHTML = Object.values(CATEGORIES).slice(0, 4).map(alt => `
          <button type="button" class="alt-cat-chip" data-cat-id="${alt.id}">
            ${alt.icon} ${alt.name}
          </button>
        `).join('');

        altContainer.querySelectorAll('.alt-cat-chip').forEach(btn => {
          btn.addEventListener('click', () => {
            const catId = btn.getAttribute('data-cat-id');
            const found = Object.values(CATEGORIES).find(c => c.id === catId);
            if (found) {
              this.currentSensedTxn.category = found.id;
              this.currentSensedTxn.categoryDetails = found;
              catBadge.innerHTML = `<span class="cat-icon">${found.icon}</span> <span>${found.name}</span>`;
              catBadge.style.backgroundColor = found.bg;
              catBadge.style.color = found.color;
            }
          });
        });
      }

      if (this.scannerStatusMsg) this.scannerStatusMsg.textContent = `✅ Sensed ₹${sensed.amount} to ${sensed.merchant}!`;
      if (this.scannerProgressFill) this.scannerProgressFill.style.width = '100%';

      this.showToast(`📸 Sensed ${sensed.paymentApp} payment of ₹${sensed.amount}!`);
    } catch (err) {
      console.error('Screenshot processing failed:', err);
      this.showToast('⚠️ Could not extract text from this image.');
      if (this.scannerStatusMsg) this.scannerStatusMsg.textContent = 'Scan complete. Please verify details.';
    }
  }

  handleSmsInputLive() {
    const text = this.elSmsInput.value;
    if (!text || text.trim().length === 0) {
      this.elSensedPreview.classList.add('hidden');
      this.currentSensedTxn = null;
      return;
    }

    const sensed = SmsSensorEngine.parse(text);
    this.currentSensedTxn = sensed;

    // Render Preview Box
    this.elSensedPreview.classList.remove('hidden');

    // Hide payment app badge for pure SMS
    if (this.sensedAppBadge) {
      this.sensedAppBadge.classList.add('hidden');
    }

    const cat = sensed.categoryDetails;
    const isCredit = sensed.type === 'credit';

    document.getElementById('sensedTypeTag').textContent = isCredit ? '💰 Inflow / Credit Sensed' : '🛒 Outflow / Debit Sensed';
    document.getElementById('sensedTypeTag').className = `status-pill ${isCredit ? 'pill-credit' : 'pill-debit'}`;

    document.getElementById('sensedAmountVal').textContent = sensed.formattedAmount;
    document.getElementById('sensedAmountVal').className = isCredit ? 'text-credit' : 'text-debit';

    document.getElementById('sensedMerchantVal').textContent = sensed.merchant;
    document.getElementById('sensedCategoryBadge').innerHTML = `<span class="cat-icon">${cat.icon}</span> <span>${cat.name}</span>`;
    document.getElementById('sensedCategoryBadge').style.backgroundColor = cat.bg;
    document.getElementById('sensedCategoryBadge').style.color = cat.color;

    document.getElementById('sensedConfidencePct').textContent = `${sensed.confidence}% AI Confidence`;
    document.getElementById('sensedReasonText').textContent = sensed.reasoning;

    const balRow = document.getElementById('sensedBalanceRow');
    if (sensed.accountBalance !== null) {
      balRow.classList.remove('hidden');
      document.getElementById('sensedBalanceVal').textContent = `₹${sensed.accountBalance.toLocaleString('en-IN')}`;
    } else {
      balRow.classList.add('hidden');
    }

    // Render quick alternative category change buttons
    const altContainer = document.getElementById('sensedAltCategories');
    if (altContainer && sensed.alternativeCategories) {
      altContainer.innerHTML = sensed.alternativeCategories.map(alt => `
        <button type="button" class="alt-cat-chip" data-cat-id="${alt.id}">
          ${alt.icon} ${alt.name}
        </button>
      `).join('');

      altContainer.querySelectorAll('.alt-cat-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const catId = btn.getAttribute('data-cat-id');
          const found = Object.values(CATEGORIES).find(c => c.id === catId);
          if (found) {
            this.currentSensedTxn.category = found.id;
            this.currentSensedTxn.categoryDetails = found;
            document.getElementById('sensedCategoryBadge').innerHTML = `<span class="cat-icon">${found.icon}</span> <span>${found.name}</span>`;
            document.getElementById('sensedCategoryBadge').style.backgroundColor = found.bg;
            document.getElementById('sensedCategoryBadge').style.color = found.color;
          }
        });
      });
    }
  }

  confirmSensedTransaction() {
    if (!this.currentSensedTxn) return;

    const txn = { ...this.currentSensedTxn };
    this.state.addTransaction(txn);

    // If SMS has balance info, auto sync starting balance adjustment
    if (txn.accountBalance !== null && !isNaN(txn.accountBalance)) {
      // Balance synced from SMS
      const metrics = this.state.getMetrics();
      this.state.startingBalance += (txn.accountBalance - metrics.totalBalance);
      this.state.saveState();
    }

    // Trigger AI Reaction!
    const metrics = this.state.getMetrics();
    const reaction = AiAdvisor.generateTransactionReaction(txn, {
      ...metrics,
      budgets: this.state.budgets
    });

    this.displayAiReaction(reaction);

    // Clear input
    this.elSmsInput.value = '';
    this.currentSensedTxn = null;
    this.elSensedPreview.classList.add('hidden');

    this.render();
    this.showToast(`Transaction added: ${txn.merchant} (${txn.formattedAmount})`);
  }

  displayAiReaction(reaction) {
    if (!this.elAiReactionCard) return;

    this.elAiReactionCard.className = `ai-reaction-banner tone-${reaction.tone}`;
    this.elAiReactionCard.innerHTML = `
      <div class="reaction-icon">${reaction.icon}</div>
      <div class="reaction-body">
        <div class="reaction-header">
          <strong>AI Co-Pilot Response: ${reaction.title}</strong>
          <span class="reaction-impact-tag">${reaction.impact}</span>
        </div>
        <p class="reaction-message">${reaction.message}</p>
      </div>
      <button type="button" class="reaction-close-btn" onclick="this.parentElement.classList.add('hidden')">✕</button>
    `;
    this.elAiReactionCard.classList.remove('hidden');

    // Also auto-add this reaction message to AI chat history
    this.appendAiChatMessage('assistant', `**${reaction.icon} Transaction Logged: ${reaction.title}**\n\n${reaction.message}\n\n*Impact:* ${reaction.impact}`);
  }

  handleManualAdd(form) {
    const merchant = form.merchantName.value.trim() || 'Manual Expense';
    const amount = parseFloat(form.txnAmount.value) || 0;
    const type = form.txnType.value || 'debit';
    const catId = form.txnCategory.value || 'misc';
    const catObj = Object.values(CATEGORIES).find(c => c.id === catId) || CATEGORIES.MISC;

    const txn = {
      id: 'txn_' + Date.now(),
      date: new Date().toISOString(),
      merchant,
      amount,
      currency: '₹',
      formattedAmount: `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      type,
      category: catId,
      categoryDetails: catObj,
      source: 'manual',
      bank: 'Cash / Other',
      paymentMode: form.txnMode ? form.txnMode.value : 'UPI'
    };

    this.state.addTransaction(txn);

    const metrics = this.state.getMetrics();
    const reaction = AiAdvisor.generateTransactionReaction(txn, {
      ...metrics,
      budgets: this.state.budgets
    });
    this.displayAiReaction(reaction);

    this.render();
    this.showToast(`Logged ₹${amount} for ${merchant}`);
  }

  async handleAiChatSubmit() {
    const query = this.elAiChatInput.value.trim();
    if (!query) return;

    this.elAiChatInput.value = '';
    this.appendAiChatMessage('user', query);

    // Show typing indicator
    const typingId = 'typing_' + Date.now();
    const typingElem = document.createElement('div');
    typingElem.id = typingId;
    typingElem.className = 'chat-bubble assistant typing-bubble';
    typingElem.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    this.elAiChatMessages.appendChild(typingElem);
    this.elAiChatMessages.scrollTop = this.elAiChatMessages.scrollHeight;

    const metrics = this.state.getMetrics();
    const fullContext = {
      ...metrics,
      budgets: this.state.budgets,
      savingsGoals: this.state.savingsGoals,
      reminders: this.state.reminders,
      transactions: this.state.transactions,
      appState: this.state
    };

    try {
      const response = await AiAdvisor.askAi(query, fullContext, this.state.apiKey, this.aiChatHistory || [], this.state);
      const typingNode = document.getElementById(typingId);
      if (typingNode) typingNode.remove();
      this.appendAiChatMessage('assistant', response);

      // Re-render UI immediately to display any modified goals, reminders, or budgets
      this.render();

      // Track multi-turn conversation
      if (!this.aiChatHistory) this.aiChatHistory = [];
      this.aiChatHistory.push({ role: 'user', text: query });
      this.aiChatHistory.push({ role: 'assistant', text: response });
    } catch (err) {
      console.error('AI Bot error:', err);
      const typingNode = document.getElementById(typingId);
      if (typingNode) typingNode.remove();
      this.appendAiChatMessage('assistant', "I'm having trouble analyzing your request right now. Please try again!");
    }
  }

  appendAiChatMessage(role, text) {
    if (!this.elAiChatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-bubble ${role}`;

    // Rich markdown formatting
    let formatted = text
      .replace(/### (.*?)\n/g, '<h4 style="margin: 0.45rem 0 0.2rem; font-size: 0.88rem; color: #a5b4fc;">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.8rem; color: #38bdf8;">$1</code>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    msgDiv.innerHTML = `
      <div class="chat-sender">${role === 'user' ? '👤 You' : '✨ Gemini 2.5'}</div>
      <div class="chat-content">${formatted}</div>
    `;

    this.elAiChatMessages.appendChild(msgDiv);
    this.elAiChatMessages.scrollTop = this.elAiChatMessages.scrollHeight;
  }

  showToast(message) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalToast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  render() {
    const metrics = this.state.getMetrics();

    // 1. Render Top Metric Cards
    if (this.elTotalBalance) {
      this.elTotalBalance.textContent = `₹${Math.round(metrics.totalBalance).toLocaleString('en-IN')}`;
    }
    if (this.elMonthlyIncome) {
      this.elMonthlyIncome.textContent = `₹${Math.round(metrics.totalIncome || this.state.monthlyAllowance).toLocaleString('en-IN')}`;
    }
    if (this.elTotalSpent) {
      this.elTotalSpent.textContent = `₹${Math.round(metrics.totalSpent).toLocaleString('en-IN')}`;
    }
    if (this.elDailySafe) {
      this.elDailySafe.textContent = `₹${Math.round(metrics.dailySafeSpend)}/day`;
    }
    if (this.elDaysLeftTag) {
      this.elDaysLeftTag.textContent = `${metrics.daysRemainingInMonth} days remaining`;
    }

    // 2. Render Charts
    this.renderCategoryBreakdown(metrics);
    this.renderWeeklyTrend(metrics);

    // 3. Render Category Budgets Progress Bars
    this.renderCategoryBudgets(metrics);

    // 4. Render AI Savings Coach Suggestions
    this.renderSavingsSuggestions(metrics);

    // 5. Render 50/30/20 Rule
    this.render503020Rule(metrics);

    // 6. Render Savings Goals
    this.renderSavingsGoals();

    // 7. Render Reminders & Bill Alerts
    this.renderReminders();

    // 8. Render Transaction Ledger
    this.renderTransactions();

    // 9. Render Student Profile info & Multiple-Time Login Links
    this.renderActiveProfileHeader();
  }

  renderActiveProfileHeader() {
    const headerProfileName = document.getElementById('headerProfileName');
    const activeProfileHeading = document.getElementById('activeProfileHeading');
    const myLoginLinkInput = document.getElementById('myLoginLinkInput');
    const myLanLoginLinkInput = document.getElementById('myLanLoginLinkInput');

    const currentUser = this.state.currentUser || 'default';
    const formattedName = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);

    if (headerProfileName) {
      headerProfileName.textContent = formattedName;
    }
    if (activeProfileHeading) {
      activeProfileHeading.textContent = `${formattedName} (Active)`;
    }

    // Determine public URL base
    const publicInput = document.getElementById('sharePublicUrlInput');
    const publicBase = (publicInput && publicInput.value) ? publicInput.value.replace(/\/$/, '') : window.location.origin;
    const lanInput = document.getElementById('shareLanUrlInput');
    const lanBase = (lanInput && lanInput.value) ? lanInput.value.replace(/\/$/, '') : 'http://192.168.31.98:3000';

    if (myLoginLinkInput) {
      myLoginLinkInput.value = `${publicBase}/?user=${currentUser}`;
    }
    if (myLanLoginLinkInput) {
      myLanLoginLinkInput.value = `${lanBase}/?user=${currentUser}`;
    }
  }

  renderProfileModal() {
    this.renderActiveProfileHeader();

    const listContainer = document.getElementById('profileListContainer');
    if (!listContainer) return;

    const currentUser = this.state.currentUser || 'default';
    const profiles = this.state.getRegisteredProfiles();

    const publicInput = document.getElementById('sharePublicUrlInput');
    const publicBase = (publicInput && publicInput.value) ? publicInput.value.replace(/\/$/, '') : window.location.origin;

    listContainer.innerHTML = profiles.map(p => {
      const isCurrent = p === currentUser;
      const pCapital = p.charAt(0).toUpperCase() + p.slice(1);
      const loginUrl = `${publicBase}/?user=${p}`;

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.8rem; background: ${isCurrent ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)'}; border-radius: 8px; border: 1px solid ${isCurrent ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-color)'};">
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <span style="font-size: 1.1rem;">👤</span>
            <div>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <strong style="font-size: 0.88rem; color: ${isCurrent ? '#818cf8' : 'var(--text-primary)'};">${pCapital}</strong>
                ${isCurrent ? '<span style="font-size: 0.65rem; background: #10b981; color: #fff; padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 600;">ACTIVE</span>' : ''}
              </div>
              <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 0.15rem;">Key: <code>student_budget_state_${p}</code></div>
            </div>
          </div>
          <div style="display: flex; gap: 0.4rem;">
            ${!isCurrent ? `<button type="button" class="btn-secondary switch-profile-btn" data-profile="${p}" style="font-size: 0.72rem; padding: 0.25rem 0.6rem;">Switch</button>` : ''}
            <button type="button" class="btn-primary copy-profile-link-btn" data-url="${loginUrl}" data-name="${pCapital}" style="font-size: 0.72rem; padding: 0.25rem 0.6rem;">📋 Copy Link</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    listContainer.querySelectorAll('.switch-profile-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-profile');
        this.state.switchUser(name);
      });
    });

    listContainer.querySelectorAll('.copy-profile-link-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.getAttribute('data-url');
        const name = btn.getAttribute('data-name');
        navigator.clipboard.writeText(url);
        this.showToast(`🔗 Login link for ${name} copied!`);
      });
    });
  }

  renderCategoryBreakdown(metrics) {
    const breakdown = Object.entries(metrics.categorySpends)
      .filter(([_, amt]) => amt > 0)
      .map(([catId, amount]) => {
        const cat = Object.values(CATEGORIES).find(c => c.id === catId) || CATEGORIES.MISC;
        return {
          id: catId,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          amount
        };
      })
      .sort((a, b) => b.amount - a.amount);

    FinanceCharts.renderCategoryDonut('categoryDonutContainer', breakdown, metrics.totalSpent);
  }

  renderWeeklyTrend(metrics) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weeklyData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const isToday = i === 0;
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      const daySpend = this.state.transactions
        .filter(t => {
          if (t.type !== 'debit') return false;
          const tDate = new Date(t.date);
          return tDate >= dayStart && tDate <= dayEnd;
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      weeklyData.push({
        shortName: dayNames[dayStart.getDay()],
        dayName: dayStart.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
        amount: daySpend,
        isToday
      });
    }

    FinanceCharts.renderWeeklySpendBar('weeklySpendBarContainer', weeklyData, metrics.dailySafeSpend);
  }

  renderCategoryBudgets(metrics) {
    const container = document.getElementById('categoryBudgetsList');
    if (!container) return;

    const items = Object.keys(this.state.budgets).map(catId => {
      const cat = Object.values(CATEGORIES).find(c => c.id === catId) || CATEGORIES.MISC;
      const budget = this.state.budgets[catId] || 1;
      const spent = metrics.categorySpends[catId] || 0;
      const pct = Math.round((spent / budget) * 100);
      let statusClass = 'safe';
      let statusLabel = 'Safe';

      if (pct >= 100) {
        statusClass = 'danger';
        statusLabel = 'Exceeded!';
      } else if (pct >= 75) {
        statusClass = 'warning';
        statusLabel = 'Warning';
      }

      return `
        <div class="cat-budget-row">
          <div class="cat-budget-info">
            <span class="cat-badge-small" style="background:${cat.bg}; color:${cat.color};">
              ${cat.icon} ${cat.name}
            </span>
            <div class="cat-budget-amounts">
              <strong>₹${spent.toLocaleString('en-IN')}</strong> / ₹${budget.toLocaleString('en-IN')}
              <span class="budget-status-tag ${statusClass}">${statusLabel} (${pct}%)</span>
            </div>
          </div>
          <div class="budget-progress-track">
            <div class="budget-progress-bar ${statusClass}" style="width: ${Math.min(100, pct)}%; background-color: ${cat.color};"></div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = items;
  }

  renderSavingsSuggestions(metrics) {
    const container = document.getElementById('savingsSuggestionsList');
    if (!container) return;

    const suggestions = AiAdvisor.generateSavingsSuggestions(metrics);
    container.innerHTML = suggestions.map(tip => `
      <div class="suggestion-card">
        <div class="sug-header">
          <span class="sug-icon">${tip.icon}</span>
          <div class="sug-meta">
            <h4>${tip.title}</h4>
            <span class="sug-tag">${tip.category}</span>
          </div>
          <span class="sug-saving">${tip.potentialSaving}</span>
        </div>
        <p class="sug-desc">${tip.description}</p>
      </div>
    `).join('');
  }

  render503020Rule(metrics) {
    const container = document.getElementById('rule503020Container');
    if (!container) return;

    const data = AiAdvisor.calculate50_30_20(metrics);
    container.innerHTML = `
      <div class="rule-grid">
        <div class="rule-card needs">
          <div class="rule-title">Needs (Target 50%)</div>
          <div class="rule-val">₹${Math.round(data.needs.actual).toLocaleString('en-IN')}</div>
          <div class="rule-bar-wrapper">
            <div class="rule-bar" style="width: ${Math.min(100, data.needs.pct)}%;"></div>
          </div>
          <div class="rule-target">Ideal: ₹${Math.round(data.needs.target).toLocaleString('en-IN')} (${data.needs.pct}%)</div>
        </div>
        <div class="rule-card wants">
          <div class="rule-title">Wants (Target 30%)</div>
          <div class="rule-val">₹${Math.round(data.wants.actual).toLocaleString('en-IN')}</div>
          <div class="rule-bar-wrapper">
            <div class="rule-bar" style="width: ${Math.min(100, data.wants.pct)}%;"></div>
          </div>
          <div class="rule-target">Ideal: ₹${Math.round(data.wants.target).toLocaleString('en-IN')} (${data.wants.pct}%)</div>
        </div>
        <div class="rule-card savings">
          <div class="rule-title">Savings (Target 20%)</div>
          <div class="rule-val">₹${Math.round(data.savings.actual).toLocaleString('en-IN')}</div>
          <div class="rule-bar-wrapper">
            <div class="rule-bar" style="width: ${Math.min(100, data.savings.pct)}%;"></div>
          </div>
          <div class="rule-target">Ideal: ₹${Math.round(data.savings.target).toLocaleString('en-IN')} (${data.savings.pct}%)</div>
        </div>
      </div>
    `;
  }

  renderSavingsGoals() {
    const container = document.getElementById('savingsGoalsList');
    if (!container) return;

    if (!this.state.savingsGoals || this.state.savingsGoals.length === 0) {
      container.innerHTML = `
        <div class="empty-state-notice">
          <span>🎯</span>
          <p>No active savings goals. Tell Gemini 2.5 <em>"Add goal Tech Fund ₹15000"</em> or click + Add Goal above!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.state.savingsGoals.map(g => {
      const pct = Math.min(100, Math.round((g.current / g.target) * 100));
      return `
        <div class="goal-card" data-goal-id="${g.id}">
          <div class="goal-info">
            <span class="goal-icon">${g.icon}</span>
            <div class="goal-meta">
              <h4>${g.title}</h4>
              <span>₹${g.current.toLocaleString('en-IN')} of ₹${g.target.toLocaleString('en-IN')}</span>
            </div>
            <strong class="goal-pct">${pct}%</strong>
            <div class="goal-actions">
              <button type="button" class="btn-deposit-goal" data-goal-id="${g.id}" data-add="500" title="Quick deposit ₹500 to this goal">+₹500</button>
              <button type="button" class="btn-delete-goal" data-goal-id="${g.id}" title="Remove this savings goal">✕</button>
            </div>
          </div>
          <div class="goal-progress-track">
            <div class="goal-progress-fill" style="width: ${pct}%; background-color: ${g.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderReminders() {
    const container = document.getElementById('remindersList');
    if (!container) return;

    if (!this.state.reminders || this.state.reminders.length === 0) {
      container.innerHTML = `
        <div class="empty-state-notice">
          <span>🔔</span>
          <p>No pending reminders or bills. Ask Gemini 2.5 <em>"Add reminder Hostel Rent 5500 on 1st"</em> or click + Add Reminder above!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.state.reminders.map(r => {
      const isDone = Boolean(r.isCompleted);
      return `
        <div class="reminder-card ${isDone ? 'reminder-done' : ''}" data-rem-id="${r.id}">
          <button type="button" class="btn-toggle-reminder ${isDone ? 'checked' : ''}" data-rem-id="${r.id}" title="${isDone ? 'Mark as pending' : 'Mark as completed'}">
            ${isDone ? '✓' : ''}
          </button>
          <span class="reminder-icon">${r.icon || '🔔'}</span>
          <div class="reminder-info">
            <h4 class="${isDone ? 'text-strikethrough' : ''}">${r.title}</h4>
            <div class="reminder-meta-tags">
              <span class="reminder-due-tag">📅 ${r.dueDate || 'Upcoming'}</span>
              ${r.amount > 0 ? `<span class="reminder-amount-badge">₹${r.amount.toLocaleString('en-IN')}</span>` : ''}
            </div>
          </div>
          <div class="reminder-actions">
            <button type="button" class="btn-delete-reminder" data-rem-id="${r.id}" title="Remove reminder">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderTransactions() {
    if (!this.elTxnTableBody) return;

    // Calculate overall ledger totals
    const totalDebits = this.state.transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalCredits = this.state.transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    if (this.ledgerTotalNetAmt) {
      this.ledgerTotalNetAmt.textContent = `₹${totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (this.ledgerTotalDebitsBadge) {
      this.ledgerTotalDebitsBadge.textContent = `Spent: -₹${totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (this.ledgerTotalCreditsBadge) {
      this.ledgerTotalCreditsBadge.textContent = `Inflow: +₹${totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    let filtered = this.state.transactions.filter(t => {
      if (this.filterType !== 'all' && t.type !== this.filterType) return false;
      if (this.filterCategory !== 'all' && t.category !== this.filterCategory) return false;
      if (this.searchQuery) {
        const query = this.searchQuery;
        const merchantMatch = (t.merchant || '').toLowerCase().includes(query);
        const catMatch = (t.categoryDetails?.name || t.category || '').toLowerCase().includes(query);
        const amountMatch = String(t.amount).includes(query);
        if (!merchantMatch && !catMatch && !amountMatch) return false;
      }
      return true;
    });

    const filteredDebits = filtered
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const filteredCredits = filtered
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    if (this.ledgerFilterStats) {
      this.ledgerFilterStats.innerHTML = `
        <span class="filter-count-badge">${filtered.length} txns</span>
        <span class="filter-amount-sum text-debit">-₹${filteredDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        ${filteredCredits > 0 ? `<span class="filter-amount-sum text-credit" style="margin-left: 4px;">(+₹${filteredCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>` : ''}
      `;
    }

    if (filtered.length === 0) {
      this.elTxnTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty">
            <span>No transactions match your filter</span>
          </td>
        </tr>
      `;
      if (this.elTxnTableFoot) {
        this.elTxnTableFoot.innerHTML = '';
      }
      return;
    }

    this.elTxnTableBody.innerHTML = filtered.map(t => {
      const isCredit = t.type === 'credit';
      const cat = t.categoryDetails || Object.values(CATEGORIES).find(c => c.id === t.category) || CATEGORIES.MISC;
      const dateStr = new Date(t.date).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const formattedAmt = `₹${Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      return `
        <tr class="txn-row ${isCredit ? 'txn-credit' : 'txn-debit'}">
          <td>
            <div class="txn-merchant-col">
              <span class="merchant-name">${t.merchant}</span>
              <div class="txn-merchant-subline">
                <span class="txn-source-tag">${t.source === 'sms_sensor' ? '🤖 SMS Sensed' : (t.source === 'android_notification' || t.source === 'finart_notification_gateway' ? '🔔 Android Push' : '✍️ Manual')}</span>
                <span class="merchant-mobile-amount ${isCredit ? 'text-credit' : 'text-debit'}">${isCredit ? '+' : '-'}${formattedAmt}</span>
              </div>
            </div>
          </td>
          <td>
            <span class="txn-cat-pill" style="background:${cat.bg}; color:${cat.color};">
              ${cat.icon} ${cat.name}
            </span>
          </td>
          <td class="txn-amount-col">
            <span class="txn-amount-pill ${isCredit ? 'amount-credit' : 'amount-debit'}">
              ${isCredit ? '+' : '-'}${formattedAmt}
            </span>
          </td>
          <td>
            <span class="txn-date">${dateStr}</span>
          </td>
          <td>
            <span class="txn-mode-tag">${t.paymentMode || 'UPI'}</span>
          </td>
          <td class="txn-actions-col">
            <button type="button" class="action-btn delete-btn" title="Delete transaction" onclick="window.appController.deleteTransaction('${t.id}')">
              🗑️
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Dynamic Ledger Totals & Summary Row at bottom
    if (this.elTxnTableFoot) {
      const netFlow = filteredCredits - filteredDebits;
      this.elTxnTableFoot.innerHTML = `
        <tr class="ledger-footer-row">
          <td colspan="2">
            <div style="font-weight: 700; color: var(--text-primary);">
              Ledger Total (${filtered.length} ${filtered.length === 1 ? 'transaction' : 'transactions'})
            </div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">
              Filtered summary of visible transactions
            </div>
          </td>
          <td class="txn-amount-col">
            <div style="display: flex; flex-direction: column; gap: 3px;">
              <span class="txn-amount-pill amount-debit" title="Total Debits in this view">
                -₹${filteredDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              ${filteredCredits > 0 ? `
                <span class="txn-amount-pill amount-credit" title="Total Inflows in this view">
                  +₹${filteredCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              ` : ''}
            </div>
          </td>
          <td colspan="3">
            <div style="font-size: 0.78rem; color: var(--text-secondary);">
              Net Flow: <strong class="${netFlow >= 0 ? 'text-credit' : 'text-debit'}">${netFlow >= 0 ? '+' : ''}₹${netFlow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
          </td>
        </tr>
      `;
    }
  }

  deleteTransaction(id) {
    if (confirm('Delete this transaction?')) {
      this.state.deleteTransaction(id);
      this.render();
      this.showToast('Transaction removed');
    }
  }

  // =========================================================
  // FinArt & SMS Gateway Engine Methods
  // =========================================================

  initGateway() {
    if (!window.finartGateway) return;

    // Listen to incoming SMS messages from the gateway client
    window.finartGateway.onMessage(msg => {
      this.handleGatewayMessage(msg);
    });

    // Start auto-polling if enabled
    if (window.finartGateway.config.autoSync) {
      window.finartGateway.startPolling();
    }

    // Refresh gateway connection info
    this.refreshGatewayInfo();
  }

  async refreshGatewayInfo() {
    if (!window.finartGateway) return;

    const info = await window.finartGateway.fetchGatewayInfo();
    if (info) {
      if (this.gwLanUrl) this.gwLanUrl.value = info.webhookUrls.lan;
      if (this.gwLocalUrl) this.gwLocalUrl.value = info.webhookUrls.localhost;
      if (this.gatewayStatusText) this.gatewayStatusText.textContent = 'SMS Gateway Live';
      if (this.openGatewayBtn) this.openGatewayBtn.classList.remove('disconnected');
    } else {
      if (this.gatewayStatusText) this.gatewayStatusText.textContent = 'Gateway Standby';
      if (this.openGatewayBtn) this.openGatewayBtn.classList.add('disconnected');
    }
  }

  async openGatewayModal() {
    if (!this.gatewayModal) return;

    // Populate inputs from FinArt Gateway config
    if (window.finartGateway) {
      const cfg = window.finartGateway.config;
      if (this.gwApiKeyInput) this.gwApiKeyInput.value = cfg.apiKey || '';
      if (this.gwRemoteEndpointInput) this.gwRemoteEndpointInput.value = cfg.remoteEndpoint || '';
      if (this.gwAutoSyncToggle) this.gwAutoSyncToggle.checked = !!cfg.autoSync;
      if (this.gwAutoConfirmToggle) this.gwAutoConfirmToggle.checked = !!cfg.autoConfirm;

      // Refresh network info & activity log
      await this.refreshGatewayInfo();
      const history = await window.finartGateway.fetchHistory();
      this.renderGatewayActivityLog(history);
    }

    this.gatewayModal.classList.remove('hidden');
  }

  renderGatewayActivityLog(history) {
    if (!this.gwActivityLogContainer) return;

    if (!history || history.length === 0) {
      this.gwActivityLogContainer.innerHTML = '<div class="gateway-log-empty">Waiting for incoming SMS from gateway... Click \'Send Test Bank SMS\' to test!</div>';
      return;
    }

    this.gwActivityLogContainer.innerHTML = history.map(item => {
      const timeStr = new Date(item.receivedAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `
        <div class="gateway-log-item">
          <div class="gw-log-main">
            <span class="gw-log-sender">${item.sender || 'SMS'}:</span>
            <span class="gw-log-text" title="${item.rawText || ''}">${item.rawText || 'Structured Transaction'}</span>
          </div>
          <span class="gw-log-time">${timeStr}</span>
        </div>
      `;
    }).join('');
  }

  addGatewayLogEntry(msg, parsedTxn) {
    if (!this.gwActivityLogContainer) return;
    const emptyNotice = this.gwActivityLogContainer.querySelector('.gateway-log-empty');
    if (emptyNotice) emptyNotice.remove();

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logItem = document.createElement('div');
    logItem.className = 'gateway-log-item';
    logItem.innerHTML = `
      <div class="gw-log-main">
        <span class="gw-log-sender">${msg.sender || 'SMS'}:</span>
        <span class="gw-log-text" title="${msg.rawText || ''}">
          <strong>${parsedTxn.formattedAmount || ('₹' + parsedTxn.amount)}</strong> at ${parsedTxn.merchant} (${parsedTxn.categoryDetails ? parsedTxn.categoryDetails.name : parsedTxn.category})
        </span>
      </div>
      <span class="gw-log-time">${timeStr}</span>
    `;

    this.gwActivityLogContainer.insertBefore(logItem, this.gwActivityLogContainer.firstChild);

    while (this.gwActivityLogContainer.children.length > 50) {
      this.gwActivityLogContainer.removeChild(this.gwActivityLogContainer.lastChild);
    }
  }

  /**
   * Dedicated Confirm & Log function:
   * Confirms and logs a transaction (from SMS Gateway or Notification Listener) straight to the ledger.
   * Calibrates balance, triggers AI financial impact reaction, syncs with Firestore, and refreshes UI.
   *
   * @param {Object} parsedTxn - Structured or parsed transaction object
   * @param {Object} [msg] - Raw gateway SMS message payload or notification event
   * @param {HTMLElement} [toastEl] - Active toast DOM element to dismiss
   * @param {Object} [options] - Options { isAuto: boolean, silentToast: boolean }
   * @returns {Object} The recorded transaction
   */
  confirmAndLogGatewayTransaction(parsedTxn, msg = {}, toastEl = null, options = {}) {
    if (!parsedTxn) return null;

    // 1. Ensure required fields are populated with stable IDs from gateway msg
    if (msg && msg.id) {
      parsedTxn.gatewayMsgId = msg.id;
      parsedTxn.id = msg.id.startsWith('txn_') ? msg.id : `txn_${msg.id}`;
    } else if (!parsedTxn.id) {
      parsedTxn.id = 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    }
    if (!parsedTxn.date) {
      parsedTxn.date = (msg && (msg.timestamp || msg.receivedAt)) || new Date().toISOString();
    }
    if (!parsedTxn.source) {
      parsedTxn.source = 'sms_gateway';
    }

    // 2. Deduplicate: avoid recording identical transaction if already in ledger
    const existing = this.state.transactions.find(t => 
      t.id === parsedTxn.id || 
      (parsedTxn.gatewayMsgId && t.gatewayMsgId === parsedTxn.gatewayMsgId) ||
      (msg && msg.id && (t.gatewayMsgId === msg.id || t.id === `txn_${msg.id}`))
    );
    if (existing) {
      console.log(`[FinArt SMS Gateway] Transaction ${parsedTxn.id} already exists in ledger, skipping duplicate.`);
      if (toastEl && typeof toastEl.remove === 'function') {
        toastEl.style.opacity = '0';
        setTimeout(() => toastEl.remove(), 250);
      }
      return existing;
    }

    // 3. Automatically add to ledger (AppState handles localStorage + Cloud Firestore sync)
    this.state.addTransaction(parsedTxn);

    // 4. Reconcile account balance if bank SMS provided available balance
    if (parsedTxn.accountBalance !== null && parsedTxn.accountBalance !== undefined && !isNaN(parsedTxn.accountBalance)) {
      const metrics = this.state.getMetrics();
      this.state.startingBalance += (Number(parsedTxn.accountBalance) - metrics.totalBalance);
      this.state.saveState();
    }

    // 5. Trigger instant AI Budget Co-pilot reaction
    const metrics = this.state.getMetrics();
    const reaction = AiAdvisor.generateTransactionReaction(parsedTxn, {
      ...metrics,
      budgets: this.state.budgets
    });
    this.displayAiReaction(reaction);

    // 6. Update ledger, charts, budget meters, and summary analytics
    this.render();

    // 7. Visual confirmation toast
    const isAuto = options.isAuto !== undefined ? options.isAuto : true;
    const catName = parsedTxn.categoryDetails ? parsedTxn.categoryDetails.name : (parsedTxn.category || 'Expense');
    const amtStr = parsedTxn.formattedAmount || ('₹' + Number(parsedTxn.amount || 0).toLocaleString('en-IN'));
    const merchant = parsedTxn.merchant || 'Payee';

    if (!options.silentToast) {
      const prefix = isAuto ? '⚡ Auto-Logged to Ledger' : '✅ Confirmed & Logged';
      this.showToast(`${prefix}: ${amtStr} at ${merchant} [${catName}]`);
    }

    // 8. Dismiss interactive toast popup if provided
    if (toastEl && typeof toastEl.remove === 'function') {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(20px)';
      setTimeout(() => toastEl.remove(), 250);
    }

    console.log(`[FinArt SMS Gateway] Auto-confirmed & logged transaction to ledger:`, parsedTxn);
    return parsedTxn;
  }

  /**
   * Helper function to automatically parse and log an incoming raw or structured SMS Gateway message to the ledger.
   * @param {Object} msg - Gateway SMS message payload
   * @returns {Object|null}
   */
  autoConfirmAndLogGatewayMessage(msg) {
    if (!msg) return null;
    let parsedTxn = null;

    if (msg.structured) {
      const catId = msg.structured.category || 'misc';
      const catDetails = Object.values(CATEGORIES).find(c => c.id === catId) || {
        id: catId,
        name: catId.charAt(0).toUpperCase() + catId.slice(1),
        icon: '📦',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.15)'
      };

      parsedTxn = {
        id: msg.id || ('txn_' + Date.now()),
        date: msg.timestamp || new Date().toISOString(),
        merchant: msg.structured.merchant || 'UPI Payee',
        amount: Number(msg.structured.amount) || 0,
        currency: '₹',
        formattedAmount: '₹' + Number(msg.structured.amount).toLocaleString('en-IN'),
        type: msg.structured.type || 'debit',
        category: catId,
        categoryDetails: catDetails,
        accountBalance: msg.structured.balance !== undefined ? msg.structured.balance : null,
        confidence: 99,
        reasoning: 'Verified through FinArt API Webhook Gateway',
        source: 'sms_gateway',
        bank: msg.structured.bank || msg.sender || 'Bank SMS Gateway',
        paymentMode: 'UPI'
      };
    } else if (msg.rawText) {
      parsedTxn = SmsSensorEngine.parse(msg.rawText);
      parsedTxn.source = 'sms_gateway';
      parsedTxn.bank = msg.sender || parsedTxn.bank || 'SMS Gateway';
    }

    if (!parsedTxn) return null;
    this.addGatewayLogEntry(msg, parsedTxn);
    return this.confirmAndLogGatewayTransaction(parsedTxn, msg, null, { isAuto: true });
  }

  handleGatewayMessage(msg) {
    let parsedTxn = null;

    if (msg.structured) {
      const catId = msg.structured.category || 'misc';
      const catDetails = Object.values(CATEGORIES).find(c => c.id === catId) || {
        id: catId,
        name: catId.charAt(0).toUpperCase() + catId.slice(1),
        icon: '📦',
        color: '#94a3b8',
        bg: 'rgba(148, 163, 184, 0.15)'
      };

      parsedTxn = {
        id: msg.id || ('txn_' + Date.now()),
        date: msg.timestamp || new Date().toISOString(),
        merchant: msg.structured.merchant || 'UPI Payee',
        amount: Number(msg.structured.amount) || 0,
        currency: '₹',
        formattedAmount: '₹' + Number(msg.structured.amount).toLocaleString('en-IN'),
        type: msg.structured.type || 'debit',
        category: catId,
        categoryDetails: catDetails,
        accountBalance: msg.structured.balance !== undefined ? msg.structured.balance : null,
        confidence: 99,
        reasoning: 'Verified through FinArt API Webhook Gateway',
        source: 'sms_gateway',
        bank: msg.structured.bank || msg.sender || 'Bank SMS Gateway',
        paymentMode: 'UPI'
      };
    } else if (msg.rawText) {
      parsedTxn = SmsSensorEngine.parse(msg.rawText);
      parsedTxn.source = 'sms_gateway';
      parsedTxn.bank = msg.sender || parsedTxn.bank || 'SMS Gateway';
    }

    if (!parsedTxn) return;

    this.addGatewayLogEntry(msg, parsedTxn);

    // If auto-confirm is enabled (default is true), automatically send to transaction ledger using confirm & log
    const autoConfirm = window.finartGateway ? (window.finartGateway.config.autoConfirm !== false) : true;

    if (autoConfirm) {
      this.confirmAndLogGatewayTransaction(parsedTxn, msg, null, { isAuto: true });
    } else {
      // Interactive floating alert prompting with Confirm & Log button
      this.showIncomingSmsToast(msg, parsedTxn);
    }
  }

  showIncomingSmsToast(msg, parsedTxn) {
    if (!this.gatewayToastContainer) return;

    const isCredit = parsedTxn.type === 'credit';
    const toast = document.createElement('div');
    toast.className = 'gateway-toast';
    toast.innerHTML = `
      <div class="toast-header">
        <div class="toast-title">
          <span>📲</span>
          <span>New SMS from ${msg.sender || 'Gateway'}</span>
        </div>
        <button type="button" class="icon-btn close-toast-btn" style="width:24px; height:24px; font-size:12px;">✕</button>
      </div>
      <div class="toast-body">
        <strong>${isCredit ? 'Credit' : 'Debit'}: ${parsedTxn.formattedAmount || ('₹' + parsedTxn.amount)}</strong> at <strong>${parsedTxn.merchant}</strong>
        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 3px;">
          Category: ${parsedTxn.categoryDetails ? parsedTxn.categoryDetails.icon + ' ' + parsedTxn.categoryDetails.name : parsedTxn.category} (${parsedTxn.confidence}% AI match)
        </div>
      </div>
      <div class="toast-actions">
        <button type="button" class="toast-btn toast-btn-primary log-now-btn">✅ Confirm & Log</button>
        <button type="button" class="toast-btn toast-btn-secondary inspect-btn">🔍 View in Sensor</button>
      </div>
    `;

    const closeBtn = toast.querySelector('.close-toast-btn');
    const logBtn = toast.querySelector('.log-now-btn');
    const inspectBtn = toast.querySelector('.inspect-btn');

    const removeToast = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 250);
    };

    closeBtn.addEventListener('click', removeToast);

    // Using confirm & log function directly
    logBtn.addEventListener('click', () => {
      this.confirmAndLogGatewayTransaction(parsedTxn, msg, toast, { isAuto: false });
    });

    inspectBtn.addEventListener('click', () => {
      if (this.elSmsInput) {
        this.elSmsInput.value = msg.rawText;
        this.switchSensorTab('sms');
        this.handleSmsInputLive();
        this.elSmsInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      removeToast();
    });

    this.gatewayToastContainer.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        removeToast();
      }
    }, 15000);
  }

  // =========================================================
  // Android Notification Listener & Gemini Coach Methods
  // =========================================================

  updateGeminiModeIndicator() {
    if (!this.geminiModeIndicator) return;
    const hasKey = this.state.apiKey && this.state.apiKey.trim().length > 8;
    if (hasKey) {
      this.geminiModeIndicator.textContent = '✨ Gemini 2.5 Flash Online';
      this.geminiModeIndicator.className = 'gemini-active-badge';
    } else {
      this.geminiModeIndicator.textContent = '✨ Gemini 2.5 Built-In';
      this.geminiModeIndicator.className = 'gemini-builtin-badge';
    }
  }

  initNotificationListener() {
    if (!window.notificationListener) return;

    // Listen to notification events from client engine
    window.addEventListener('android-notification:message', (e) => {
      this.handleIncomingNotification(e.detail);
    });

    // Initial fetch of gateway info
    this.refreshNotificationInfo();

    // Start polling if enabled
    if (window.notificationListener.config.autoSync) {
      window.notificationListener.startPolling();
    }
  }

  async refreshNotificationInfo() {
    if (!window.notificationListener) return;
    const info = await window.notificationListener.fetchGatewayInfo();
    if (info) {
      if (this.notifLanUrl) this.notifLanUrl.value = info.webhookUrls.lan;
      if (this.notifLocalUrl) this.notifLocalUrl.value = info.webhookUrls.localhost;
      if (this.notifStatusText) {
        this.notifStatusText.textContent = 'Android Listener Active';
      }
    }
  }

  async openNotificationModal() {
    if (!this.notificationModal) return;
    await this.refreshNotificationInfo();

    if (window.notificationListener) {
      const cfg = window.notificationListener.config;
      if (this.notifAutoSyncToggle) this.notifAutoSyncToggle.checked = cfg.autoSync;
      if (this.notifAutoConfirmToggle) this.notifAutoConfirmToggle.checked = cfg.autoConfirm;

      // Load recent history
      const history = await window.notificationListener.fetchHistory();
      if (this.notifActivityLogContainer) {
        if (!history || history.length === 0) {
          this.notifActivityLogContainer.innerHTML = '<div class="gateway-log-empty">No notifications captured yet. Connect MacroDroid or click the Test Simulator!</div>';
        } else {
          this.notifActivityLogContainer.innerHTML = history.map(item => {
            const timeStr = new Date(item.receivedAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const catId = item.structured?.category || (item.transaction?.category) || 'misc';
            const catDetails = (typeof CATEGORIES !== 'undefined' && CATEGORIES[catId.toUpperCase()])
              ? CATEGORIES[catId.toUpperCase()]
              : (Object.values(CATEGORIES || {}).find(c => c.id === catId) || null);
            const amtStr = item.structured?.amount ? `₹${Number(item.structured.amount).toLocaleString('en-IN')}` : (item.transaction?.formattedAmount || '');
            const merchStr = item.structured?.merchant || item.transaction?.merchant || item.title || item.appName || '';

            return `
              <div class="gateway-log-item notif-log-item">
                <div class="gw-log-main">
                  <span class="gw-log-sender" style="color: #38bdf8; font-weight: 700;">[${item.appName || 'Android'}]:</span>
                  <span class="gw-log-text">
                    ${amtStr ? `<strong>${amtStr}</strong> at <em>${merchStr}</em>` : (item.text || item.title || '')}
                    ${catDetails ? `
                      <span style="background: ${catDetails.bg || 'rgba(99,102,241,0.15)'}; color: ${catDetails.color || '#a5b4fc'}; padding: 0.15rem 0.5rem; border-radius: 9999px; font-weight: 600; font-size: 0.72rem; margin-left: 6px; display: inline-flex; align-items: center; gap: 4px;">
                        ${catDetails.icon} ${catDetails.name}
                      </span>
                    ` : ''}
                  </span>
                </div>
                <span class="gw-log-time">${timeStr}</span>
              </div>
            `;
          }).join('');
        }
      }
    }

    this.notificationModal.classList.remove('hidden');
  }

  handleIncomingNotification(notifData) {
    const txn = notifData.transaction;
    if (!txn) return;

    // Check if duplicate transaction
    const exists = this.state.transactions.some(t => t.id === txn.id || (txn.notificationId && t.notificationId === txn.notificationId));
    if (exists) return;

    // Log to modal feed
    this.addNotificationLogEntry(notifData, txn);

    // Auto-confirm mode or floating interactive alert
    if (window.notificationListener && window.notificationListener.config.autoConfirm) {
      this.confirmAndLogGatewayTransaction(txn, notifData, null, { isAuto: true });
    } else {
      this.showIncomingNotificationToast(notifData, txn);
    }
  }

  showIncomingNotificationToast(notifData, txn) {
    if (!this.gatewayToastContainer) return;

    const isCredit = txn.type === 'credit';
    const toast = document.createElement('div');
    toast.className = 'gateway-toast notif-toast';
    toast.innerHTML = `
      <div class="toast-header">
        <div class="toast-title">
          <span>🔔</span>
          <span style="color: #38bdf8; font-weight: 700;">${notifData.appName || 'Android App'} Alert</span>
        </div>
        <button type="button" class="icon-btn close-toast-btn" style="width:24px; height:24px; font-size:12px;">✕</button>
      </div>
      <div class="toast-body">
        <div style="font-size: 1.05rem; margin-bottom: 4px;">
          <strong>${isCredit ? 'Credit' : 'Debit'}: ${txn.formattedAmount || ('₹' + txn.amount)}</strong> at <strong>${txn.merchant}</strong>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
          <span style="background: ${txn.categoryDetails?.bg || 'rgba(99,102,241,0.18)'}; color: ${txn.categoryDetails?.color || '#a5b4fc'}; padding: 0.2rem 0.6rem; border-radius: 9999px; font-weight: 700; font-size: 0.76rem; border: 1px solid ${txn.categoryDetails?.color || '#818cf8'}44;">
            ${txn.categoryDetails ? txn.categoryDetails.icon + ' ' + txn.categoryDetails.name : (txn.category || 'Miscellaneous')}
          </span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">⚡ FinArt AI (${txn.confidence || 95}% match)</span>
        </div>
      </div>
      <div class="toast-actions">
        <button type="button" class="toast-btn toast-btn-primary log-notif-btn">⚡ Confirm & Log</button>
        <button type="button" class="toast-btn toast-btn-secondary dismiss-notif-btn">✕ Dismiss</button>
      </div>
    `;

    const closeBtn = toast.querySelector('.close-toast-btn');
    const logBtn = toast.querySelector('.log-notif-btn');
    const dismissBtn = toast.querySelector('.dismiss-notif-btn');

    const removeToast = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      setTimeout(() => toast.remove(), 250);
    };

    closeBtn.addEventListener('click', removeToast);
    dismissBtn.addEventListener('click', removeToast);

    logBtn.addEventListener('click', () => {
      this.confirmAndLogGatewayTransaction(txn, notifData, toast, { isAuto: false });
    });

    this.gatewayToastContainer.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        removeToast();
      }
    }, 15000);
  }

  addNotificationLogEntry(notif, txn) {
    if (!this.notifActivityLogContainer) return;
    const emptyEl = this.notifActivityLogContainer.querySelector('.gateway-log-empty');
    if (emptyEl) emptyEl.remove();

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logItem = document.createElement('div');
    logItem.className = 'gateway-log-item notif-log-item';
    logItem.innerHTML = `
      <div class="gw-log-main">
        <span class="gw-log-sender" style="color: #38bdf8; font-weight: 700;">[${notif.appName || 'Android'}]:</span>
        <span class="gw-log-text">
          <strong>${txn.formattedAmount}</strong> at <em>${txn.merchant}</em>
          <span style="background: ${txn.categoryDetails?.bg || 'rgba(99,102,241,0.15)'}; color: ${txn.categoryDetails?.color || '#a5b4fc'}; padding: 0.15rem 0.5rem; border-radius: 9999px; font-weight: 600; font-size: 0.72rem; margin-left: 6px; display: inline-flex; align-items: center; gap: 4px;">
            ${txn.categoryDetails ? txn.categoryDetails.icon + ' ' + txn.categoryDetails.name : txn.category}
          </span>
        </span>
      </div>
      <span class="gw-log-time">${timeStr}</span>
    `;

    this.notifActivityLogContainer.prepend(logItem);
  }

  // =========================================================
  // Cloud Firestore Database Methods
  // =========================================================

  initFirestore() {
    if (!window.firestoreDb) return;

    // Header Button & Pill Elements
    this.openFirestoreBtn = document.getElementById('openFirestoreBtn');
    this.firestoreStatusText = document.getElementById('firestoreStatusText');
    this.closeFirestoreBtn = document.getElementById('closeFirestoreBtn');
    this.firestoreModal = document.getElementById('firestoreModal');

    // Status Card Elements
    this.fsStatusDot = document.getElementById('fsStatusDot');
    this.fsStatusBadge = document.getElementById('fsStatusBadge');
    this.fsStatusDetails = document.getElementById('fsStatusDetails');
    this.fsMetaProject = document.getElementById('fsMetaProject');
    this.fsMetaProfile = document.getElementById('fsMetaProfile');
    this.fsMetaLastSync = document.getElementById('fsMetaLastSync');
    this.fsRealtimeToggle = document.getElementById('fsRealtimeToggle');

    // Action Buttons & Feedback
    this.fsTestConnBtn = document.getElementById('fsTestConnBtn');
    this.fsPushLocalBtn = document.getElementById('fsPushLocalBtn');
    this.fsPullCloudBtn = document.getElementById('fsPullCloudBtn');
    this.fsActionFeedback = document.getElementById('fsActionFeedback');

    // Config Form & Inputs
    this.firestoreConfigForm = document.getElementById('firestoreConfigForm');
    this.fsPasteConfigInput = document.getElementById('fsPasteConfigInput');
    this.fsParsePasteBtn = document.getElementById('fsParsePasteBtn');
    this.fsProjectIdInput = document.getElementById('fsProjectIdInput');
    this.fsApiKeyInput = document.getElementById('fsApiKeyInput');
    this.fsAuthDomainInput = document.getElementById('fsAuthDomainInput');
    this.fsStorageBucketInput = document.getElementById('fsStorageBucketInput');
    this.fsAppIdInput = document.getElementById('fsAppIdInput');
    this.fsProfileIdInput = document.getElementById('fsProfileIdInput');
    this.fsClearConfigBtn = document.getElementById('fsClearConfigBtn');

    // Listen for Firestore service status changes
    window.firestoreDb.onStatusChange(info => {
      this.updateFirestoreUI(info);
    });

    // Initialize Firestore service
    window.firestoreDb.init().then(connected => {
      if (connected) {
        this.attachFirestoreListeners();
      }
    });

    // Wire Modal Open/Close
    if (this.openFirestoreBtn && this.firestoreModal) {
      this.openFirestoreBtn.addEventListener('click', () => {
        this.openFirestoreModal();
      });
    }

    if (this.closeFirestoreBtn && this.firestoreModal) {
      this.closeFirestoreBtn.addEventListener('click', () => {
        this.firestoreModal.classList.add('hidden');
      });
    }

    // Modal Tabs
    const tabButtons = this.firestoreModal ? this.firestoreModal.querySelectorAll('.modal-tab-btn') : null;
    if (tabButtons) {
      tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTabId = btn.getAttribute('data-tab');
          tabButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          this.firestoreModal.querySelectorAll('.firestore-tab-content').forEach(tab => {
            tab.classList.add('hidden');
          });

          const activeTab = document.getElementById(targetTabId);
          if (activeTab) activeTab.classList.remove('hidden');
        });
      });
    }

    // Real-time toggle
    if (this.fsRealtimeToggle) {
      this.fsRealtimeToggle.checked = window.firestoreDb.config.realtimeEnabled !== false;
      this.fsRealtimeToggle.addEventListener('change', () => {
        window.firestoreDb.config.realtimeEnabled = this.fsRealtimeToggle.checked;
        window.firestoreDb.saveConfig(window.firestoreDb.config);
        if (this.fsRealtimeToggle.checked) {
          this.attachFirestoreListeners();
          this.showToast('🔥 Real-time cloud sync enabled!');
        } else {
          window.firestoreDb.disconnectListeners();
          this.showToast('⏸️ Real-time cloud sync paused.');
        }
      });
    }

    // 1-Click Paste & Parse Auto-fill
    if (this.fsParsePasteBtn && this.fsPasteConfigInput) {
      this.fsParsePasteBtn.addEventListener('click', () => {
        const val = this.fsPasteConfigInput.value;
        if (!val.trim()) {
          this.showToast('⚠️ Please paste your Firebase config snippet first.');
          return;
        }

        const parsed = window.FirestoreService ? window.FirestoreService.parseConfigString(val) : null;
        if (parsed) {
          if (parsed.projectId && this.fsProjectIdInput) this.fsProjectIdInput.value = parsed.projectId;
          if (parsed.apiKey && this.fsApiKeyInput) this.fsApiKeyInput.value = parsed.apiKey;
          if (parsed.authDomain && this.fsAuthDomainInput) this.fsAuthDomainInput.value = parsed.authDomain;
          if (parsed.storageBucket && this.fsStorageBucketInput) this.fsStorageBucketInput.value = parsed.storageBucket;
          if (parsed.appId && this.fsAppIdInput) this.fsAppIdInput.value = parsed.appId;

          this.showFirestoreFeedback('✅ Auto-filled fields from snippet! Click "Save & Connect" below to activate.', 'success');
          this.showToast('✨ Firebase fields auto-filled!');
        } else {
          this.showFirestoreFeedback('❌ Could not parse config. Please verify the snippet or enter fields manually.', 'error');
        }
      });
    }

    // Save Config Form
    if (this.firestoreConfigForm) {
      this.firestoreConfigForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cfg = {
          projectId: this.fsProjectIdInput ? this.fsProjectIdInput.value.trim() : '',
          apiKey: this.fsApiKeyInput ? this.fsApiKeyInput.value.trim() : '',
          authDomain: this.fsAuthDomainInput ? this.fsAuthDomainInput.value.trim() : '',
          storageBucket: this.fsStorageBucketInput ? this.fsStorageBucketInput.value.trim() : '',
          appId: this.fsAppIdInput ? this.fsAppIdInput.value.trim() : '',
          profileId: (this.fsProfileIdInput ? this.fsProfileIdInput.value.trim() : '') || 'student_default',
          realtimeEnabled: this.fsRealtimeToggle ? this.fsRealtimeToggle.checked : true
        };

        this.showFirestoreFeedback('Connecting to Cloud Firestore...', 'info');
        const ok = await window.firestoreDb.saveConfig(cfg);
        if (ok) {
          this.showFirestoreFeedback(`✅ Connected to Cloud Firestore project "${cfg.projectId}"!`, 'success');
          this.showToast(`🔥 Cloud Firestore connected to "${cfg.projectId}"!`);
          this.attachFirestoreListeners();
        } else {
          this.showFirestoreFeedback(`❌ Connection failed: ${window.firestoreDb.statusMessage}`, 'error');
        }
      });
    }

    // Clear Config Button
    if (this.fsClearConfigBtn) {
      this.fsClearConfigBtn.addEventListener('click', () => {
        if (confirm('Disconnect from Cloud Firestore and switch to Local Storage mode?')) {
          window.firestoreDb.disconnectListeners();
          localStorage.removeItem(window.firestoreDb.storageKey);
          window.firestoreDb.config = window.firestoreDb.loadConfig();
          window.firestoreDb.isInitialized = false;
          window.firestoreDb._notifyStatus('not_configured', 'Cloud Firestore not configured (Local storage mode active)');
          this.openFirestoreModal();
          this.showToast('Switched to Local Storage mode.');
        }
      });
    }

    // Test Connection Button
    if (this.fsTestConnBtn) {
      this.fsTestConnBtn.addEventListener('click', async () => {
        this.fsTestConnBtn.disabled = true;
        const origText = this.fsTestConnBtn.textContent;
        this.fsTestConnBtn.textContent = '⏳ Testing Ping...';
        this.showFirestoreFeedback('Sending test ping to Cloud Firestore...', 'info');

        const res = await window.firestoreDb.testConnection();
        this.fsTestConnBtn.disabled = false;
        this.fsTestConnBtn.textContent = origText;

        if (res.success) {
          this.showFirestoreFeedback(`✅ ${res.message}`, 'success');
          this.showToast(`⚡ Firestore latency: ${res.latencyMs}ms!`);
        } else {
          this.showFirestoreFeedback(`❌ ${res.message}`, 'error');
          this.showToast('❌ Firestore test failed. Check rules & credentials.');
        }
      });
    }

    // Push Local Data to Cloud
    if (this.fsPushLocalBtn) {
      this.fsPushLocalBtn.addEventListener('click', async () => {
        const count = this.state.transactions.length;
        if (!confirm(`Upload ${count} local transactions, budgets, and savings goals to Cloud Firestore?`)) return;

        this.fsPushLocalBtn.disabled = true;
        this.showFirestoreFeedback('Uploading data to Cloud Firestore...', 'info');

        const res = await window.firestoreDb.syncLocalToCloud(this.state, progress => {
          this.showFirestoreFeedback(`⏳ ${progress.message}`, 'info');
        });

        this.fsPushLocalBtn.disabled = false;
        if (res.success) {
          this.showFirestoreFeedback(`✅ ${res.message}`, 'success');
          this.showToast(`☁️ Uploaded ${res.count} transactions to Firestore!`);
        } else {
          this.showFirestoreFeedback(`❌ ${res.message}`, 'error');
          this.showToast('❌ Cloud upload failed.');
        }
      });
    }

    // Pull Cloud Data to Local
    if (this.fsPullCloudBtn) {
      this.fsPullCloudBtn.addEventListener('click', async () => {
        if (!confirm('Download transactions and budgets from Cloud Firestore? This will update your local view.')) return;

        this.fsPullCloudBtn.disabled = true;
        this.showFirestoreFeedback('Downloading from Cloud Firestore...', 'info');

        const res = await window.firestoreDb.syncCloudToLocal(this.state, progress => {
          this.showFirestoreFeedback(`⏳ ${progress.message}`, 'info');
        });

        this.fsPullCloudBtn.disabled = false;
        if (res.success) {
          this.render();
          this.showFirestoreFeedback(`✅ ${res.message}`, 'success');
          this.showToast(`📥 Pulled ${res.count} transactions from Firestore!`);
        } else {
          this.showFirestoreFeedback(`❌ ${res.message}`, 'error');
          this.showToast('❌ Cloud download failed.');
        }
      });
    }
  }

  attachFirestoreListeners() {
    if (!window.firestoreDb || !window.firestoreDb.isInitialized) return;

    // 1. Transactions realtime listener
    window.firestoreDb.subscribeToTransactions((remoteTxns) => {
      if (Array.isArray(remoteTxns) && remoteTxns.length > 0) {
        // Only update if different to avoid unnecessary re-renders
        const localIds = new Set(this.state.transactions.map(t => t.id));
        const remoteIds = new Set(remoteTxns.map(t => t.id));
        const hasDiff = localIds.size !== remoteIds.size || [...remoteIds].some(id => !localIds.has(id));

        if (hasDiff) {
          this.state.transactions = remoteTxns;
          this.state.saveState(true); // true = skip remote write loop
          this.render();
          console.log('[Firestore] Synced incoming real-time transactions from cloud.');
        }
      }
    });

    // 2. App State realtime listener
    window.firestoreDb.subscribeToAppState((remoteState) => {
      if (remoteState) {
        let changed = false;
        if (remoteState.monthlyAllowance !== undefined && remoteState.monthlyAllowance !== this.state.monthlyAllowance) {
          this.state.monthlyAllowance = remoteState.monthlyAllowance;
          changed = true;
        }
        if (remoteState.startingBalance !== undefined && remoteState.startingBalance !== this.state.startingBalance) {
          this.state.startingBalance = remoteState.startingBalance;
          changed = true;
        }
        if (remoteState.budgets && JSON.stringify(remoteState.budgets) !== JSON.stringify(this.state.budgets)) {
          this.state.budgets = remoteState.budgets;
          changed = true;
        }
        if (remoteState.savingsGoals && JSON.stringify(remoteState.savingsGoals) !== JSON.stringify(this.state.savingsGoals)) {
          this.state.savingsGoals = remoteState.savingsGoals;
          changed = true;
        }
        if (remoteState.reminders && JSON.stringify(remoteState.reminders) !== JSON.stringify(this.state.reminders)) {
          this.state.reminders = remoteState.reminders;
          changed = true;
        }

        if (changed) {
          this.state.saveState(true);
          this.render();
          console.log('[Firestore] Synced incoming real-time budgets/goals from cloud.');
        }
      }
    });
  }

  openFirestoreModal() {
    if (!this.firestoreModal) return;
    const cfg = window.firestoreDb ? window.firestoreDb.config : {};

    if (this.fsProjectIdInput) this.fsProjectIdInput.value = cfg.projectId || '';
    if (this.fsApiKeyInput) this.fsApiKeyInput.value = cfg.apiKey || '';
    if (this.fsAuthDomainInput) this.fsAuthDomainInput.value = cfg.authDomain || '';
    if (this.fsStorageBucketInput) this.fsStorageBucketInput.value = cfg.storageBucket || '';
    if (this.fsAppIdInput) this.fsAppIdInput.value = cfg.appId || '';
    if (this.fsProfileIdInput) this.fsProfileIdInput.value = cfg.profileId || 'student_default';
    if (this.fsRealtimeToggle) this.fsRealtimeToggle.checked = cfg.realtimeEnabled !== false;

    this.firestoreModal.classList.remove('hidden');
  }

  updateFirestoreUI(info) {
    if (!this.openFirestoreBtn) return;

    // Header Pill
    if (info.status === 'connected') {
      this.openFirestoreBtn.classList.add('connected');
      this.openFirestoreBtn.classList.remove('error');
      if (this.firestoreStatusText) this.firestoreStatusText.textContent = '🔥 Firestore Live';
      const dot = this.openFirestoreBtn.querySelector('.pulse-dot');
      if (dot) dot.style.background = '#10b981';
    } else if (info.status === 'connecting') {
      this.openFirestoreBtn.classList.remove('connected', 'error');
      if (this.firestoreStatusText) this.firestoreStatusText.textContent = '🔥 Connecting...';
      const dot = this.openFirestoreBtn.querySelector('.pulse-dot');
      if (dot) dot.style.background = '#38bdf8';
    } else if (info.status === 'error') {
      this.openFirestoreBtn.classList.add('error');
      this.openFirestoreBtn.classList.remove('connected');
      if (this.firestoreStatusText) this.firestoreStatusText.textContent = '🔥 Firestore Error';
      const dot = this.openFirestoreBtn.querySelector('.pulse-dot');
      if (dot) dot.style.background = '#ef4444';
    } else {
      this.openFirestoreBtn.classList.remove('connected', 'error');
      if (this.firestoreStatusText) this.firestoreStatusText.textContent = '🔥 Firestore';
      const dot = this.openFirestoreBtn.querySelector('.pulse-dot');
      if (dot) dot.style.background = '#f97316';
    }

    // Modal Status Card
    if (this.fsStatusDot) {
      if (info.status === 'connected') this.fsStatusDot.style.background = '#10b981';
      else if (info.status === 'error') this.fsStatusDot.style.background = '#ef4444';
      else if (info.status === 'connecting') this.fsStatusDot.style.background = '#38bdf8';
      else this.fsStatusDot.style.background = '#f97316';
    }

    if (this.fsStatusBadge) {
      this.fsStatusBadge.className = 'firestore-badge';
      if (info.status === 'connected') {
        this.fsStatusBadge.classList.add('connected');
        this.fsStatusBadge.textContent = 'Cloud Synced';
      } else if (info.status === 'error') {
        this.fsStatusBadge.classList.add('error');
        this.fsStatusBadge.textContent = 'Connection Error';
      } else if (info.status === 'connecting') {
        this.fsStatusBadge.classList.add('connecting');
        this.fsStatusBadge.textContent = 'Connecting...';
      } else {
        this.fsStatusBadge.classList.add('warning');
        this.fsStatusBadge.textContent = 'Local Storage Mode';
      }
    }

    if (this.fsStatusDetails) this.fsStatusDetails.textContent = info.message || '';
    if (this.fsMetaProject) this.fsMetaProject.textContent = info.projectId || 'Not Configured';
    if (this.fsMetaProfile) this.fsMetaProfile.textContent = info.profileId || 'student_default';
    if (this.fsMetaLastSync) {
      this.fsMetaLastSync.textContent = info.lastSync
        ? new Date(info.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Never';
    }
  }

  showFirestoreFeedback(message, type = 'info') {
    if (!this.fsActionFeedback) return;
    this.fsActionFeedback.classList.remove('hidden');
    if (type === 'success') {
      this.fsActionFeedback.style.background = 'rgba(16, 185, 129, 0.15)';
      this.fsActionFeedback.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      this.fsActionFeedback.style.color = '#34d399';
    } else if (type === 'error') {
      this.fsActionFeedback.style.background = 'rgba(239, 68, 68, 0.15)';
      this.fsActionFeedback.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      this.fsActionFeedback.style.color = '#f87171';
    } else {
      this.fsActionFeedback.style.background = 'rgba(56, 189, 248, 0.15)';
      this.fsActionFeedback.style.border = '1px solid rgba(56, 189, 248, 0.4)';
      this.fsActionFeedback.style.color = '#38bdf8';
    }
    this.fsActionFeedback.textContent = message;
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.appController = new UIController();
});

// Global accessibility helper functions
window.confirmAndLogGatewayTransaction = function(parsedTxn, msg, toastEl, opts) {
  if (window.appController && typeof window.appController.confirmAndLogGatewayTransaction === 'function') {
    return window.appController.confirmAndLogGatewayTransaction(parsedTxn, msg, toastEl, opts);
  }
  return null;
};

window.autoConfirmAndLogGatewayMessage = function(msg) {
  if (window.appController && typeof window.appController.autoConfirmAndLogGatewayMessage === 'function') {
    return window.appController.autoConfirmAndLogGatewayMessage(msg);
  }
  return null;
};
