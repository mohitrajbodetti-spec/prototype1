/**
 * Cloud Firestore Database Service for Student Budget Tracker
 * Provides real-time synchronization, offline caching, and multi-device persistence
 * using Google Cloud Firestore via Firebase Web SDK (compat).
 */

class FirestoreService {
  constructor() {
    this.storageKey = 'student_budget_firebase_cfg_v1';
    this.app = null;
    this.db = null;
    this.isInitialized = false;
    this.status = 'not_configured'; // 'not_configured' | 'connecting' | 'connected' | 'offline' | 'error'
    this.statusMessage = 'Cloud Firestore not configured (using local storage)';
    this.lastSyncTime = null;
    this.listeners = [];
    this.unsubscribeTxns = null;
    this.unsubscribeState = null;
    this.realtimeEnabled = true;

    // Load saved configuration from localStorage
    this.config = this.loadConfig();
  }

  /**
   * Load stored Firebase configuration
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            apiKey: parsed.apiKey || '',
            authDomain: parsed.authDomain || '',
            projectId: parsed.projectId || '',
            storageBucket: parsed.storageBucket || '',
            messagingSenderId: parsed.messagingSenderId || '',
            appId: parsed.appId || '',
            measurementId: parsed.measurementId || '',
            profileId: (parsed.profileId || 'student_default').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
            realtimeEnabled: parsed.realtimeEnabled !== undefined ? Boolean(parsed.realtimeEnabled) : true
          };
        }
      }
    } catch (e) {
      console.warn('[Firestore] Error reading saved config:', e);
    }

    return {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      measurementId: '',
      profileId: 'student_default',
      realtimeEnabled: true
    };
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig(newConfig) {
    this.config = {
      apiKey: (newConfig.apiKey || '').trim(),
      authDomain: (newConfig.authDomain || '').trim(),
      projectId: (newConfig.projectId || '').trim(),
      storageBucket: (newConfig.storageBucket || '').trim(),
      messagingSenderId: (newConfig.messagingSenderId || '').trim(),
      appId: (newConfig.appId || '').trim(),
      measurementId: (newConfig.measurementId || '').trim(),
      profileId: ((newConfig.profileId || 'student_default').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')) || 'student_default',
      realtimeEnabled: newConfig.realtimeEnabled !== undefined ? Boolean(newConfig.realtimeEnabled) : true
    };

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (e) {
      console.error('[Firestore] Could not save config to localStorage:', e);
    }

    this.realtimeEnabled = this.config.realtimeEnabled;
    return this.init();
  }

  /**
   * Check if Firebase configuration has minimum required fields
   */
  isConfigured() {
    return Boolean(
      this.config &&
      this.config.projectId &&
      this.config.apiKey
    );
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      // Immediately notify with current status
      callback({
        status: this.status,
        message: this.statusMessage,
        lastSync: this.lastSyncTime,
        projectId: this.config.projectId,
        profileId: this.config.profileId
      });
    }
  }

  /**
   * Notify status listeners
   */
  _notifyStatus(status, message) {
    this.status = status;
    this.statusMessage = message || '';
    const payload = {
      status: this.status,
      message: this.statusMessage,
      lastSync: this.lastSyncTime,
      projectId: this.config ? this.config.projectId : '',
      profileId: this.config ? this.config.profileId : 'student_default'
    };
    this.listeners.forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error('[Firestore] Listener error:', err);
      }
    });
  }

  /**
   * Initialize Firebase and Firestore instances
   */
  async init() {
    // Unsubscribe from any active snapshot listeners
    this.disconnectListeners();

    if (!this.isConfigured()) {
      this._notifyStatus('not_configured', 'Cloud Firestore not configured (Local storage mode active)');
      return false;
    }

    if (typeof firebase === 'undefined') {
      this._notifyStatus('error', 'Firebase SDK script not loaded or network offline.');
      return false;
    }

    this._notifyStatus('connecting', `Connecting to Firebase Project: ${this.config.projectId}...`);

    try {
      const appName = 'student_budget_app';
      // Find existing or initialize app
      let existingApp = null;
      try {
        existingApp = firebase.app(appName);
      } catch (e) {
        // App not created yet
      }

      if (existingApp) {
        // Delete previous app instance if config changed
        await existingApp.delete();
      }

      this.app = firebase.initializeApp({
        apiKey: this.config.apiKey,
        authDomain: this.config.authDomain || `${this.config.projectId}.firebaseapp.com`,
        projectId: this.config.projectId,
        storageBucket: this.config.storageBucket || `${this.config.projectId}.appspot.com`,
        messagingSenderId: this.config.messagingSenderId,
        appId: this.config.appId,
        measurementId: this.config.measurementId
      }, appName);

      this.db = this.app.firestore();

      // Enable offline persistence if supported in current browser
      try {
        await this.db.enablePersistence({ synchronizeTabs: true });
        console.log('[Firestore] Offline persistence enabled with multi-tab synchronization.');
      } catch (err) {
        if (err.code === 'failed-precondition') {
          console.warn('[Firestore] Multi-tab persistence failed (multiple tabs open).');
        } else if (err.code === 'unimplemented') {
          console.warn('[Firestore] Browser does not support IndexedDB persistence.');
        } else {
          console.log('[Firestore] Persistence info:', err.message);
        }
      }

      this.isInitialized = true;
      this._notifyStatus('connected', `Connected to Cloud Firestore (${this.config.projectId})`);
      return true;
    } catch (err) {
      console.error('[Firestore] Initialization error:', err);
      this._notifyStatus('error', `Connection error: ${err.message}`);
      return false;
    }
  }

  /**
   * Helper to get user base collection path
   */
  _getUserRef() {
    if (!this.db) throw new Error('Firestore not initialized');
    const profileId = this.config.profileId || 'student_default';
    return this.db.collection('users').doc(profileId);
  }

  _getTransactionsRef() {
    return this._getUserRef().collection('transactions');
  }

  _getSettingsRef() {
    return this._getUserRef().collection('settings').doc('app_state');
  }

  /**
   * Test Cloud Firestore connection by executing a fast ping read/write
   */
  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, message: 'Please enter your Firebase Project ID and API Key first.' };
    }

    if (!this.isInitialized || !this.db) {
      const ok = await this.init();
      if (!ok) return { success: false, message: this.statusMessage };
    }

    const startTime = Date.now();
    try {
      const pingRef = this._getUserRef().collection('system').doc('ping');
      const testTimestamp = new Date().toISOString();

      // Write test document
      await pingRef.set({
        lastPing: testTimestamp,
        clientTime: startTime,
        deviceAgent: navigator.userAgent.slice(0, 80)
      }, { merge: true });

      // Read test document back
      const snap = await pingRef.get();
      const latency = Date.now() - startTime;

      if (snap.exists) {
        this.lastSyncTime = new Date().toISOString();
        this._notifyStatus('connected', `Connected to Cloud Firestore (${this.config.projectId})`);
        return {
          success: true,
          latencyMs: latency,
          message: `Connection successful! Ping roundtrip: ${latency}ms to project "${this.config.projectId}". Profile: "${this.config.profileId}".`
        };
      } else {
        return { success: false, message: 'Test document was written but could not be read back.' };
      }
    } catch (err) {
      console.error('[Firestore] Test connection failed:', err);
      let errorHint = err.message;
      if (err.code === 'permission-denied') {
        errorHint = 'Permission denied. Ensure your Firestore Security Rules allow read/write (e.g. set test rules in Firebase Console).';
      }
      return { success: false, message: `Connection failed: ${errorHint}` };
    }
  }

  /**
   * Save a single transaction to Cloud Firestore
   */
  async saveTransaction(txn) {
    if (!this.isInitialized || !this.db) return false;
    try {
      if (!txn || !txn.id) return false;

      // Clean object to prevent non-serializable fields
      const cleanTxn = this._sanitizeTransaction(txn);
      cleanTxn.updatedAt = new Date().toISOString();

      await this._getTransactionsRef().doc(txn.id).set(cleanTxn, { merge: true });
      this.lastSyncTime = new Date().toISOString();
      return true;
    } catch (err) {
      console.warn('[Firestore] Error saving transaction:', txn.id, err);
      return false;
    }
  }

  /**
   * Delete a transaction from Cloud Firestore
   */
  async deleteTransaction(txnId) {
    if (!this.isInitialized || !this.db) return false;
    try {
      if (!txnId) return false;
      await this._getTransactionsRef().doc(txnId).delete();
      this.lastSyncTime = new Date().toISOString();
      return true;
    } catch (err) {
      console.warn('[Firestore] Error deleting transaction:', txnId, err);
      return false;
    }
  }

  /**
   * Fetch all transactions for this profile from Cloud Firestore
   */
  async fetchTransactions() {
    if (!this.isInitialized || !this.db) return null;
    try {
      const snap = await this._getTransactionsRef()
        .orderBy('date', 'desc')
        .get();

      const txns = [];
      snap.forEach(doc => {
        txns.push({ id: doc.id, ...doc.data() });
      });

      this.lastSyncTime = new Date().toISOString();
      return txns;
    } catch (err) {
      console.warn('[Firestore] Error fetching transactions:', err);
      return null;
    }
  }

  /**
   * Save application state (allowance, balance, budgets, savings goals, reminders)
   */
  async saveAppState(state) {
    if (!this.isInitialized || !this.db) return false;
    try {
      const payload = {
        monthlyAllowance: Number(state.monthlyAllowance) || 0,
        startingBalance: Number(state.startingBalance) || 0,
        budgets: state.budgets || {},
        savingsGoals: (state.savingsGoals || []).map(g => ({
          id: g.id,
          title: g.title,
          target: Number(g.target) || 0,
          current: Number(g.current) || 0,
          icon: g.icon || '🎯',
          color: g.color || '#6366f1'
        })),
        reminders: (state.reminders || []).map(r => ({
          id: r.id,
          title: r.title,
          amount: Number(r.amount) || 0,
          dueDate: r.dueDate || '',
          isCompleted: Boolean(r.isCompleted),
          icon: r.icon || '🔔',
          category: r.category || 'misc'
        })),
        theme: state.theme || 'dark',
        updatedAt: new Date().toISOString()
      };

      await this._getSettingsRef().set(payload, { merge: true });
      this.lastSyncTime = new Date().toISOString();
      return true;
    } catch (err) {
      console.warn('[Firestore] Error saving app state:', err);
      return false;
    }
  }

  /**
   * Fetch application state from Cloud Firestore
   */
  async fetchAppState() {
    if (!this.isInitialized || !this.db) return null;
    try {
      const doc = await this._getSettingsRef().get();
      if (!doc.exists) return null;
      this.lastSyncTime = new Date().toISOString();
      return doc.data();
    } catch (err) {
      console.warn('[Firestore] Error fetching app state:', err);
      return null;
    }
  }

  /**
   * Upload all local transactions and settings to Cloud Firestore (Push Migration)
   */
  async syncLocalToCloud(appState, onProgress) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Firestore is not configured.' };
    }
    if (!this.isInitialized || !this.db) {
      const ok = await this.init();
      if (!ok) return { success: false, message: this.statusMessage };
    }

    try {
      if (onProgress) onProgress({ status: 'starting', message: 'Starting cloud upload...', current: 0, total: 1 });

      // 1. Sync app state (budgets, goals, reminders)
      if (onProgress) onProgress({ status: 'saving_state', message: 'Syncing budgets, goals, and allowance...', current: 1, total: 5 });
      await this.saveAppState(appState);

      // 2. Batch upload transactions (in batches of up to 400 to respect Firestore 500 ops limit)
      const txns = appState.transactions || [];
      const totalTxns = txns.length;
      const batchSize = 400;

      for (let i = 0; i < totalTxns; i += batchSize) {
        const chunk = txns.slice(i, i + batchSize);
        const batch = this.db.batch();

        chunk.forEach(txn => {
          if (!txn || !txn.id) return;
          const ref = this._getTransactionsRef().doc(txn.id);
          const clean = this._sanitizeTransaction(txn);
          clean.updatedAt = new Date().toISOString();
          batch.set(ref, clean, { merge: true });
        });

        await batch.commit();

        if (onProgress) {
          const currentCount = Math.min(i + batchSize, totalTxns);
          onProgress({
            status: 'uploading_txns',
            message: `Uploaded ${currentCount} / ${totalTxns} transactions to Cloud Firestore...`,
            current: currentCount,
            total: totalTxns
          });
        }
      }

      this.lastSyncTime = new Date().toISOString();
      this._notifyStatus('connected', `Synced ${totalTxns} transactions to Cloud Firestore`);
      return {
        success: true,
        count: totalTxns,
        message: `Successfully uploaded ${totalTxns} transactions, budgets, and savings goals to Cloud Firestore!`
      };
    } catch (err) {
      console.error('[Firestore] Push sync failed:', err);
      return { success: false, message: `Cloud upload error: ${err.message}` };
    }
  }

  /**
   * Pull all transactions and state from Cloud Firestore into local application (Pull Sync)
   */
  async syncCloudToLocal(appState, onProgress) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Firestore is not configured.' };
    }
    if (!this.isInitialized || !this.db) {
      const ok = await this.init();
      if (!ok) return { success: false, message: this.statusMessage };
    }

    try {
      if (onProgress) onProgress({ status: 'fetching', message: 'Downloading data from Cloud Firestore...', current: 0, total: 2 });

      // 1. Fetch remote settings
      const remoteState = await this.fetchAppState();
      if (remoteState) {
        if (remoteState.monthlyAllowance !== undefined) appState.monthlyAllowance = remoteState.monthlyAllowance;
        if (remoteState.startingBalance !== undefined) appState.startingBalance = remoteState.startingBalance;
        if (remoteState.budgets) appState.budgets = remoteState.budgets;
        if (remoteState.savingsGoals) appState.savingsGoals = remoteState.savingsGoals;
        if (remoteState.reminders) appState.reminders = remoteState.reminders;
        if (remoteState.theme) appState.theme = remoteState.theme;
      }

      // 2. Fetch remote transactions
      const remoteTxns = await this.fetchTransactions();
      let importedCount = 0;
      if (remoteTxns && remoteTxns.length > 0) {
        appState.transactions = remoteTxns;
        importedCount = remoteTxns.length;
      }

      // Persist merged state to local storage
      appState.saveState();

      this.lastSyncTime = new Date().toISOString();
      this._notifyStatus('connected', `Downloaded ${importedCount} transactions from Cloud Firestore`);

      return {
        success: true,
        count: importedCount,
        message: `Successfully pulled ${importedCount} transactions and budgets from Cloud Firestore!`
      };
    } catch (err) {
      console.error('[Firestore] Pull sync failed:', err);
      return { success: false, message: `Cloud download error: ${err.message}` };
    }
  }

  /**
   * Real-time listener for incoming changes on transactions
   */
  subscribeToTransactions(onUpdate, onError) {
    if (!this.isInitialized || !this.db || !this.realtimeEnabled) return;

    if (this.unsubscribeTxns) {
      this.unsubscribeTxns();
      this.unsubscribeTxns = null;
    }

    try {
      this.unsubscribeTxns = this._getTransactionsRef()
        .orderBy('date', 'desc')
        .onSnapshot(snapshot => {
          const txns = [];
          snapshot.forEach(doc => {
            txns.push({ id: doc.id, ...doc.data() });
          });
          this.lastSyncTime = new Date().toISOString();
          if (typeof onUpdate === 'function') {
            onUpdate(txns, snapshot.metadata.hasPendingWrites);
          }
        }, err => {
          console.warn('[Firestore] Realtime transactions listener warning:', err.message);
          if (typeof onError === 'function') onError(err);
        });
    } catch (err) {
      console.warn('[Firestore] Failed to attach transactions realtime listener:', err);
    }
  }

  /**
   * Real-time listener for app settings/budgets
   */
  subscribeToAppState(onUpdate, onError) {
    if (!this.isInitialized || !this.db || !this.realtimeEnabled) return;

    if (this.unsubscribeState) {
      this.unsubscribeState();
      this.unsubscribeState = null;
    }

    try {
      this.unsubscribeState = this._getSettingsRef().onSnapshot(doc => {
        if (doc.exists) {
          this.lastSyncTime = new Date().toISOString();
          if (typeof onUpdate === 'function') {
            onUpdate(doc.data(), doc.metadata.hasPendingWrites);
          }
        }
      }, err => {
        console.warn('[Firestore] Realtime state listener warning:', err.message);
        if (typeof onError === 'function') onError(err);
      });
    } catch (err) {
      console.warn('[Firestore] Failed to attach state realtime listener:', err);
    }
  }

  /**
   * Disconnect any active real-time listeners
   */
  disconnectListeners() {
    if (this.unsubscribeTxns) {
      try { this.unsubscribeTxns(); } catch (e) {}
      this.unsubscribeTxns = null;
    }
    if (this.unsubscribeState) {
      try { this.unsubscribeState(); } catch (e) {}
      this.unsubscribeState = null;
    }
  }

  /**
   * Clean transaction object for Firestore serialization
   */
  _sanitizeTransaction(txn) {
    return {
      id: String(txn.id),
      date: txn.date || new Date().toISOString(),
      merchant: String(txn.merchant || 'Unknown'),
      amount: Number(txn.amount) || 0,
      currency: txn.currency || '₹',
      type: txn.type === 'credit' ? 'credit' : 'debit',
      category: txn.category || 'misc',
      source: txn.source || 'manual',
      bank: txn.bank || 'UPI / Cash',
      paymentMode: txn.paymentMode || 'UPI',
      description: txn.description || '',
      note: txn.note || '',
      mainCategory: txn.mainCategory || '',
      subCategory: txn.subCategory || '',
      confidence: txn.confidence !== undefined ? Number(txn.confidence) : null,
      rawSms: txn.rawSms || ''
    };
  }

  /**
   * Parse Firebase Config from pasted JavaScript or JSON string
   * Handles formats like:
   * const firebaseConfig = { apiKey: "...", projectId: "..." };
   * or direct JSON
   */
  static parseConfigString(inputStr) {
    if (!inputStr || typeof inputStr !== 'string') return null;
    const trimmed = inputStr.trim();

    // 1. Try pure JSON parse first
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === 'object') return obj;
    } catch (e) {
      // Continue to regex extractor
    }

    // 2. Extract key-value pairs using regex (matches standard Firebase console snippet)
    const result = {};
    const keys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];

    keys.forEach(k => {
      const re = new RegExp(`['"]?${k}['"]?\\s*:\\s*['"\`]([^'"\`]+)['"\`]`, 'i');
      const match = trimmed.match(re);
      if (match && match[1]) {
        result[k] = match[1].trim();
      }
    });

    if (result.projectId || result.apiKey) {
      return result;
    }

    return null;
  }
}

// Global instance available to the app
window.FirestoreService = FirestoreService;
window.firestoreDb = new FirestoreService();
