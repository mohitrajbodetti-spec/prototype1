/**
 * Android Notification Listener Client Engine
 * Connects the web application to the local Node.js Android Notification Listener Webhook
 * Intercepts payment push notifications from Google Pay, PhonePe, Paytm, CRED, BHIM, and Banking apps.
 */

class NotificationListenerClient {
  constructor() {
    this.storageKey = 'student_budget_notif_cfg_v1';
    this.defaultConfig = {
      enabled: true,
      autoSync: true,
      autoConfirm: false, // Prompt user with toast or auto-confirm
      pollIntervalMs: 3000
    };

    this.config = this.loadConfig();
    this.pollTimer = null;
    this.isPolling = false;
    this.listeners = [];
    this.processedIds = new Set();
    this.connectionStatus = 'disconnected'; // 'connected' | 'disconnected' | 'error'
    this.gatewayInfo = null;
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return { ...this.defaultConfig, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[NotificationListener] Failed to parse stored config:', e);
    }
    return { ...this.defaultConfig };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (e) {
      console.warn('[NotificationListener] Failed to save config:', e);
    }

    if (this.config.autoSync && this.config.enabled) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  onNotification(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  async notifyListeners(notificationData) {
    if (!notificationData) return;

    // Deduplicate so poll() doesn't re-trigger already processed alerts
    if (!this.processedIds) this.processedIds = new Set();
    if (notificationData.id && this.processedIds.has(notificationData.id)) {
      return;
    }
    if (notificationData.id) {
      this.processedIds.add(notificationData.id);
    }

    // Connect directly to FinArt Gateway API for automatic category sensing & intelligence
    let parsedTxn = null;
    if (window.finartGateway && typeof window.finartGateway.categorizeNotification === 'function') {
      try {
        parsedTxn = await window.finartGateway.categorizeNotification(notificationData);
      } catch (err) {
        console.warn('[NotificationListener] FinArt categorization failed, using fallback:', err);
      }
    }

    if (!parsedTxn) {
      parsedTxn = this.parseNotification(notificationData);
    }

    const enriched = {
      ...notificationData,
      transaction: parsedTxn
    };

    this.listeners.forEach(cb => {
      try {
        cb(enriched);
      } catch (err) {
        console.error('[NotificationListener] Listener error:', err);
      }
    });

    // Also dispatch a browser DOM event for decoupled app handling
    window.dispatchEvent(new CustomEvent('android-notification:message', {
      detail: enriched
    }));

    // If FinArt gateway exists, broadcast synced event
    window.dispatchEvent(new CustomEvent('finart:notification-synced', {
      detail: enriched
    }));
  }

  async fetchGatewayInfo() {
    try {
      const res = await fetch('/api/notifications/gateway-info');
      if (res.ok) {
        this.gatewayInfo = await res.json();
        this.connectionStatus = 'connected';
        return this.gatewayInfo;
      }
      this.connectionStatus = 'error';
      return null;
    } catch (e) {
      this.connectionStatus = 'disconnected';
      return null;
    }
  }

  startPolling() {
    this.stopPolling();
    if (!this.config.enabled || !this.config.autoSync) return;

    // Immediately poll once
    this.poll();

    // Schedule regular polling
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.config.pollIntervalMs || 3000);
    this.isPolling = true;
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isPolling = false;
  }

  async poll() {
    try {
      const res = await fetch('/api/notifications/poll?markRead=true');
      if (!res.ok) {
        this.connectionStatus = 'error';
        return;
      }

      this.connectionStatus = 'connected';
      const data = await res.json();

      if (data && data.notifications && data.notifications.length > 0) {
        for (const notif of data.notifications) {
          await this.notifyListeners(notif);
        }
      }
    } catch (e) {
      this.connectionStatus = 'disconnected';
    }
  }

  async fetchHistory() {
    try {
      const res = await fetch('/api/notifications/history');
      if (res.ok) {
        const data = await res.json();
        return data.history || [];
      }
    } catch (e) {
      console.warn('[NotificationListener] Failed to fetch history:', e);
    }
    return [];
  }

  /**
   * Triggers simulator test in Android Notification Listener
   * Instantly categorizes via FinArt API and notifies UI
   */
  async triggerSimulatorTest(indexOrPayload = null) {
    let sample = null;
    const samples = NotificationListenerClient.TEST_SAMPLES || [];

    if (typeof indexOrPayload === 'number') {
      sample = samples[indexOrPayload] || samples[0];
    } else if (typeof indexOrPayload === 'object' && indexOrPayload !== null && indexOrPayload.text) {
      sample = {
        packageName: indexOrPayload.packageName || 'com.google.android.apps.nbu.paisa.user',
        appName: indexOrPayload.appName || 'Google Pay',
        title: indexOrPayload.title || 'Google Pay',
        text: indexOrPayload.text,
        subText: indexOrPayload.subText || 'Manual Simulation'
      };
    } else {
      sample = samples[Math.floor(Math.random() * samples.length)];
    }

    const testId = `notif_sim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const notifEntry = {
      id: testId,
      packageName: sample.packageName,
      appName: sample.appName,
      title: sample.title,
      text: sample.text,
      subText: sample.subText || '',
      timestamp: Date.now(),
      receivedAt: new Date().toISOString(),
      isSimulated: true
    };

    // Mark as processed so poll() doesn't duplicate
    if (!this.processedIds) this.processedIds = new Set();
    this.processedIds.add(testId);

    // Notify server asynchronously in background if running (non-blocking)
    try {
      fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeof indexOrPayload === 'number' ? { index: indexOrPayload } : sample)
      }).catch(() => {
        // Server offline; client-side simulation proceeds
      });
    } catch (e) {}

    // IMMEDIATELY notify listeners through FinArt category sensor
    await this.notifyListeners(notifEntry);

    return {
      success: true,
      entry: notifEntry
    };
  }

  async clearQueues() {
    try {
      const res = await fetch('/api/notifications/clear', { method: 'POST' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Parses Android Notification content into a full student budget transaction
   * Uses FinArt AI Category Sensor & Heuristics
   */
  parseNotification(notif) {
    const rawText = `${notif.text || ''} ${notif.subText || ''} ${notif.title || ''}`.trim();
    const appSource = notif.appName || notif.packageName || 'Android Payment App';

    // If SmsSensorEngine or SmsDetector is available, leverage its AI Category Sensor
    const sensor = (typeof SmsSensorEngine !== 'undefined') ? SmsSensorEngine : (typeof SmsDetector !== 'undefined' ? SmsDetector : null);
    if (sensor && typeof sensor.parse === 'function') {
      const parsed = sensor.parse(rawText, appSource);
      parsed.source = 'android_notification';
      parsed.sourceApp = appSource;
      parsed.packageName = notif.packageName || '';
      parsed.notificationId = notif.id;

      // Refine merchant name if Unknown
      if (!parsed.merchant || parsed.merchant === 'Unknown Merchant') {
        const titleWords = (notif.title || '').trim();
        if (titleWords && !titleWords.toLowerCase().includes('pay') && !titleWords.toLowerCase().includes('alert')) {
          parsed.merchant = titleWords;
        } else {
          parsed.merchant = appSource;
        }
      }

      // Ensure Category is properly sensed and attached
      if (typeof sensor.senseCategory === 'function') {
        const catInfo = sensor.senseCategory(parsed.merchant, rawText, parsed.type);
        parsed.category = catInfo.category;
        parsed.categoryDetails = catInfo.details;
        parsed.confidence = catInfo.confidence;
        parsed.reasoning = `FinArt Sensor: ${catInfo.reasoning}`;
      }

      return parsed;
    }

    // Fallback parser if sensor is not loaded
    const amountMatch = rawText.match(/(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹))/i);
    const amount = amountMatch ? parseFloat((amountMatch[1] || amountMatch[2]).replace(/,/g, '')) : 100;
    const isCredit = /(?:received|credited|refund|cashback|added|deposit|paid you|sent you|transferred you|allowance|stipend|salary)/i.test(rawText);

    let category = 'misc';
    let catDetails = null;
    let confidence = 70;
    let reasoning = 'Fallback Keyword Match';

    if (isCredit) {
      category = 'income';
      if (typeof CATEGORIES !== 'undefined' && CATEGORIES.INCOME) {
        catDetails = CATEGORIES.INCOME;
      }
      confidence = 99;
      reasoning = 'Received funds / Inflow detected';
    } else if (typeof CATEGORIES !== 'undefined') {
      const lower = rawText.toLowerCase();
      for (const [key, info] of Object.entries(CATEGORIES)) {
        if (key === 'INCOME') continue;
        if (info.keywords && info.keywords.some(kw => lower.includes(kw))) {
          category = info.id;
          catDetails = info;
          confidence = 88;
          reasoning = `Matched keyword for ${info.name}`;
          break;
        }
      }
    }

    return {
      id: notif.id || ('txn_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
      rawText,
      type: isCredit ? 'credit' : 'debit',
      amount,
      currency: '₹',
      formattedAmount: `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      merchant: notif.title || appSource,
      category,
      categoryDetails: catDetails,
      confidence,
      reasoning,
      date: new Date().toISOString(),
      source: 'android_notification',
      sourceApp: appSource,
      packageName: notif.packageName || ''
    };
  }
}

// 6 Realistic Indian Student Payment Notification Samples
NotificationListenerClient.TEST_SAMPLES = [
  {
    packageName: 'com.google.android.apps.nbu.paisa.user',
    appName: 'Google Pay',
    title: 'Google Pay',
    text: 'Paid ₹180 to Campus Canteen',
    subText: 'UPI Payment Successful'
  },
  {
    packageName: 'com.phonepe.app',
    appName: 'PhonePe',
    title: 'PhonePe',
    text: 'Paid ₹450 to PVR Cinema for Movie Tickets',
    subText: 'Txn ID: T2609230918'
  },
  {
    packageName: 'net.one97.paytm',
    appName: 'Paytm',
    title: 'Paytm',
    text: 'Paid ₹1,200 to University Book Store',
    subText: 'Academics & Stationary'
  },
  {
    packageName: 'com.dreamplug.androidapp',
    appName: 'CRED',
    title: 'CRED UPI',
    text: 'Received ₹3,000 from Dad (Monthly Allowance)',
    subText: 'Credit to Bank Account'
  },
  {
    packageName: 'com.google.android.apps.nbu.paisa.user',
    appName: 'Google Pay',
    title: 'Google Pay',
    text: 'Paid ₹85 to Chai Point',
    subText: 'Beverages & Snacks'
  },
  {
    packageName: 'in.org.npci.upiapp',
    appName: 'BHIM UPI',
    title: 'BHIM UPI',
    text: 'Paid ₹240 to Uber India for Campus Ride',
    subText: 'Travel & Commute'
  }
];

// Global instance attached to window
window.notificationListener = new NotificationListenerClient();
