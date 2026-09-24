/**
 * FinArt & SMS Gateway Client Engine
 * Connects the web application to the local Node.js SMS Gateway Webhook
 * and supports external FinArt Cloud API endpoints.
 */

class FinartGatewayClient {
  constructor() {
    this.storageKey = 'student_budget_gateway_cfg_v2';
    this.defaultConfig = {
      enabled: true,
      autoSync: true,
      autoConfirm: true, // Automatically confirm & log incoming SMS to transaction ledger
      pollIntervalMs: 3000,
      apiKey: '',
      remoteEndpoint: '', // Optional external FinArt parsing endpoint
      webhookSecret: ''
    };

    this.config = this.loadConfig();
    this.pollTimer = null;
    this.isPolling = false;
    this.lastReceivedId = null;
    this.listeners = [];
    this.connectionStatus = 'disconnected'; // 'connected' | 'disconnected' | 'error'
    this.gatewayInfo = null;
  }

  loadConfig() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.autoConfirm === undefined) {
          parsed.autoConfirm = true;
        }
        return { ...this.defaultConfig, ...parsed };
      }
    } catch (e) {
      console.warn('[FinartGateway] Failed to parse stored config:', e);
    }
    return { ...this.defaultConfig };
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (e) {
      console.warn('[FinartGateway] Failed to save config:', e);
    }

    // Adjust polling state
    if (this.config.autoSync && this.config.enabled) {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  onMessage(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyListeners(messageData) {
    this.listeners.forEach(cb => {
      try {
        cb(messageData);
      } catch (err) {
        console.error('[FinartGateway] Listener error:', err);
      }
    });

    // Also dispatch a browser DOM event for decoupled handling
    window.dispatchEvent(new CustomEvent('sms-gateway:message', {
      detail: messageData
    }));
  }

  async fetchGatewayInfo() {
    try {
      const res = await fetch('/api/sms/gateway-info');
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
      const res = await fetch('/api/sms/poll?markRead=true');
      if (!res.ok) {
        this.connectionStatus = 'error';
        return;
      }

      this.connectionStatus = 'connected';
      const data = await res.json();

      if (data && data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          this.notifyListeners(msg);
        });
      }
    } catch (e) {
      this.connectionStatus = 'disconnected';
    }
  }

  async fetchHistory() {
    try {
      const res = await fetch('/api/sms/history');
      if (res.ok) {
        const data = await res.json();
        return data.history || [];
      }
    } catch (e) {
      console.warn('[FinartGateway] Failed to fetch history:', e);
    }
    return [];
  }

  async triggerSimulatorTest() {
    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('[FinartGateway] Test trigger error:', e);
    }
    return { success: false };
  }

  async clearQueues() {
    try {
      const res = await fetch('/api/sms/clear', { method: 'POST' });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Optional: Sends raw SMS to external FinArt Cloud API if configured
   */
  async parseWithRemoteFinartApi(smsText) {
    if (!this.config.remoteEndpoint) {
      return null;
    }

    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        headers['X-API-Key'] = this.config.apiKey;
      }

      const res = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sms: smsText,
          timestamp: new Date().toISOString()
        })
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[FinartGateway] Remote FinArt API call failed:', err);
    }
    return null;
  }

  /**
   * Helper to resolve Category Details object from category ID
   */
  _getCategoryDetails(catId) {
    if (typeof CATEGORIES === 'undefined') return null;
    if (!catId) return CATEGORIES.MISC || null;
    const upper = String(catId).toUpperCase();
    if (CATEGORIES[upper]) return CATEGORIES[upper];
    const match = Object.values(CATEGORIES).find(c => c.id === String(catId).toLowerCase());
    return match || CATEGORIES.MISC || null;
  }

  /**
   * FinArt Notification Categorization & Intelligence Engine
   * Categorizes incoming Android payment notifications automatically using:
   * 1. Remote FinArt API (if configured)
   * 2. Local AI Category Sensor (keywords, regex, heuristics, and student category mapping)
   */
  async categorizeNotification(notif) {
    const rawText = `${notif.text || ''} ${notif.subText || ''} ${notif.title || ''}`.trim();
    const appSource = notif.appName || notif.packageName || 'Android Payment App';

    // 1. If remote FinArt Cloud API endpoint is configured, try it
    if (this.config.remoteEndpoint) {
      try {
        const remoteResult = await this.parseWithRemoteFinartApi(rawText);
        if (remoteResult && (remoteResult.category || remoteResult.amount)) {
          const catId = (remoteResult.category || 'misc').toLowerCase();
          const catDetails = this._getCategoryDetails(catId);

          return {
            id: notif.id || ('txn_' + Date.now()),
            type: remoteResult.type || 'debit',
            amount: Number(remoteResult.amount) || 0,
            currency: '₹',
            formattedAmount: `₹${Number(remoteResult.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            merchant: remoteResult.merchant || notif.title || appSource,
            category: catId,
            categoryDetails: catDetails,
            confidence: remoteResult.confidence || 95,
            reasoning: 'Categorized automatically via FinArt Cloud API',
            source: 'finart_notification_gateway',
            sourceApp: appSource,
            packageName: notif.packageName || '',
            date: new Date().toISOString()
          };
        }
      } catch (err) {
        console.warn('[FinartGateway] Remote parsing failed, using local AI sensor:', err);
      }
    }

    // 2. High-Precision FinArt AI Category Sensor via SmsSensorEngine
    let merchant = '';
    const toMatch = rawText.match(/(?:to|at|from|paid to|sent to)\s+([A-Za-z0-9\s&'.()_-]+?)(?=\s+(?:for|on|via|ref|txn|avl|dated|\()|\s*$)/i);
    if (toMatch && toMatch[1]) {
      merchant = toMatch[1].trim();
    } else if (notif.title && !notif.title.toLowerCase().includes('pay') && !notif.title.toLowerCase().includes('alert')) {
      merchant = notif.title.trim();
    } else {
      merchant = appSource;
    }

    if (typeof SmsSensorEngine !== 'undefined') {
      const parsed = SmsSensorEngine.parse(rawText);
      if (parsed) {
        parsed.id = notif.id || parsed.id;
        parsed.source = 'finart_notification_gateway';
        parsed.sourceApp = appSource;
        parsed.packageName = notif.packageName || '';
        parsed.notificationId = notif.id;

        // If merchant was generic, apply extracted merchant
        if (!parsed.merchant || parsed.merchant === 'Unknown Merchant' || parsed.merchant === appSource) {
          parsed.merchant = merchant;
        }

        // Sense Category using FinArt multi-factor keyword & merchant heuristics
        const catInfo = SmsSensorEngine.senseCategory(parsed.merchant, rawText, parsed.type);
        parsed.category = catInfo.category;
        parsed.categoryDetails = catInfo.details;
        parsed.confidence = Math.max(catInfo.confidence || 92, 92);
        parsed.reasoning = `FinArt Sensor: ${catInfo.reasoning}`;

        return parsed;
      }
    }

    // 3. Structured Server / Fallback extraction heuristics
    const amountMatch = rawText.match(/(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹))/i);
    const amount = amountMatch ? parseFloat((amountMatch[1] || amountMatch[2]).replace(/,/g, '')) : (notif.structured?.amount || 100);
    const isCredit = /(?:received|credited|refund|cashback|added|allowance|deposit|paid you|sent you|transferred you)/i.test(rawText);

    let category = isCredit ? 'income' : (notif.structured?.category || 'misc');
    let catDetails = this._getCategoryDetails(category);
    let confidence = isCredit ? 98 : 88;
    let reasoning = isCredit ? 'FinArt Income & Inflow Detected' : 'FinArt AI Keyword Match';

    if (typeof SmsSensorEngine !== 'undefined') {
      const catInfo = SmsSensorEngine.senseCategory(merchant, rawText, isCredit ? 'credit' : (notif.structured?.type || 'debit'));
      category = catInfo.category;
      catDetails = catInfo.details;
      confidence = catInfo.confidence;
      reasoning = catInfo.reasoning;
    }

    return {
      id: notif.id || ('txn_' + Date.now()),
      rawText,
      type: isCredit ? 'credit' : (notif.structured?.type || 'debit'),
      amount,
      currency: '₹',
      formattedAmount: `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      merchant: merchant || notif.title || appSource,
      category,
      categoryDetails: catDetails,
      confidence,
      reasoning: `FinArt Sensor: ${reasoning}`,
      date: new Date().toISOString(),
      source: 'finart_notification_gateway',
      sourceApp: appSource,
      packageName: notif.packageName || ''
    };
  }
}

// Global instance attached to window
window.finartGateway = new FinartGatewayClient();
