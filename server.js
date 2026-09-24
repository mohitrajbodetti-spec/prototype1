/**
 * Student Budget Tracker & AI Category Sensor Server
 * Lightweight Zero-Dependency Local Static Web Server + FinArt SMS Gateway REST API
 * Runs with agy-node or node
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

let currentPort = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Finart-Token',
  'Access-Control-Max-Age': '86400'
};

// In-Memory Gateway Message Queues
let incomingMessages = []; // Pending messages awaiting client poll
let historyLog = [];       // Recent 50 incoming gateway messages

// In-Memory Android Notification Queues
let incomingNotifications = []; // Pending notifications awaiting client poll
let notificationHistoryLog = []; // Recent 50 incoming notification events

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

/**
 * Helper to parse request body as string or JSON
 */
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Protect against overly large payloads (> 1MB)
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(body);
        parsed._rawBody = body;
        resolve(parsed);
      } catch (e) {
        // Fallback: form-urlencoded or plain text
        if (body.includes('=') && !body.includes('{')) {
          const params = new URLSearchParams(body);
          const obj = {};
          for (const [k, v] of params.entries()) {
            obj[k] = v;
          }
          return resolve(obj);
        }
        resolve({ text: body, message: body });
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Cache-Control': 'no-cache',
    ...CORS_HEADERS
  });
  res.end(JSON.stringify(data, null, 2));
}

// Preset simulator alerts for testing the gateway
const TEST_SMS_SAMPLES = [
  'Sent Rs. 380.00 from HDFC Bank A/C *4821 to Swiggy via UPI Ref 42938194. Avl Bal: Rs 14,250.00',
  'Paid INR 75.00 to Campus Canteen on 22-Sep-26 via Google Pay UPI. Avl Bal INR 14,175.00',
  'Rs 1,450.00 debited from A/C *8291 at Campus Book Depot on 22-Sep-26. Avl Bal: Rs 12,725.00',
  'Dear Student, your A/C *4821 is debited by Rs 5,500.00 on 22-Sep-26 to Ashok Kumar (PG Rent). Avl Bal Rs 7,225.00',
  'INR 300.00 debited for DMRC Metro Auto Topup. Avl Balance: INR 6,925.00',
  'Your A/C *4821 credited with Rs. 15,000.00 by Rajesh Sharma (Dad Allowance) on 22-Sep-26. Avl Bal: Rs 21,925.00',
  'INR 199.00 debited from Card ending 9102 for Netflix Subscription. Avl Bal INR 21,726.00',
  'Paid Rs. 420.00 at Zepto Groceries via PhonePe UPI. Avl Bal: Rs 21,306.00',
  'Rs 360.00 debited from A/C *4821 at PVR Movie Theater on 22-Sep-26 via UPI. Avl Bal: Rs 20,946.00'
];

// Preset Android payment notification samples for testing
const TEST_NOTIFICATION_SAMPLES = [
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

/**
 * Server-side FinArt Notification Intelligence & Categorization Engine
 * Automatically extracts amount, merchant, type, and student budget category
 */
function categorizeNotificationServer(text = '', title = '', subText = '', appName = '') {
  const fullText = `${text} ${subText} ${title} ${appName}`.toLowerCase();
  
  // Extract amount
  const amountMatch = (text + ' ' + subText).match(/(?:(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹))/i);
  let amount = 0;
  if (amountMatch) {
    amount = parseFloat((amountMatch[1] || amountMatch[2]).replace(/,/g, ''));
  }

  // Type: debit or credit
  const isCredit = /(?:received|credited|refund|cashback|added|allowance|deposit|paid you|sent you|transferred you)/i.test(text + ' ' + subText);
  const type = isCredit ? 'credit' : 'debit';

  // Extract merchant / sender
  let merchant = '';
  if (isCredit) {
    const fromMatch = (text + ' ' + subText).match(/\b(?:from|by|received from)\s+([A-Za-z0-9\s&'.]+?)(?:\s+(?:for|on|via|ref|txn|avl|to|\()|[\s.,;!?-]*$)/i);
    if (fromMatch && fromMatch[1]) {
      const clean = fromMatch[1].trim();
      if (!/^(?:google pay|gpay|phonepe|paytm|bhim|cred|upi)$/i.test(clean)) {
        merchant = clean;
      }
    }
  }

  if (!merchant) {
    const toMatch = text.match(/(?:to|at|from)\s+([A-Za-z0-9\s&'.]+?)(?:\s+(?:for|on|via|ref|txn|avl|\()|\s*$)/i);
    if (toMatch && toMatch[1]) {
      merchant = toMatch[1].trim();
    } else if (title && !title.toLowerCase().includes('pay') && !title.toLowerCase().includes('alert')) {
      merchant = title.trim();
    } else if (isCredit) {
      if (/phonepe/i.test(fullText)) merchant = 'PhonePe Inflow';
      else if (/google pay|gpay/i.test(fullText)) merchant = 'Google Pay Inflow';
      else if (/paytm/i.test(fullText)) merchant = 'Paytm Inflow';
      else if (/cred/i.test(fullText)) merchant = 'CRED Inflow';
      else merchant = 'Bank Deposit / Allowance';
    } else {
      merchant = appName || 'Personal Transfer';
    }
  }

  // Category Sensor Heuristics (synced with FinArt & Student Categories)
  let category = 'misc';
  if (isCredit) {
    category = 'income';
  } else if (/(?:swiggy|zomato|canteen|mess|cafe|coffee|chai|starbucks|mcdonalds|kfc|dominos|pizza|burger|snack|food|restaurant|dining|bakery|bake|blinkit|zepto|instamart|grocery|supermarket|subway)/i.test(fullText)) {
    category = 'food';
  } else if (/(?:theater|theatre|cinema|movie|pvr|inox|cinepolis|imax|play|drama|stage|netflix|spotify|prime|hotstar|youtube|bookmyshow|steam|gaming|discord|pub|club|party|concert)/i.test(fullText)) {
    category = 'entertainment';
  } else if (/(?:book|bookstore|college|university|tuition|library|stationary|stationery|xerox|print|udemy|coursera|course|exam|fee|classes|lab|academic|textbook)/i.test(fullText)) {
    category = 'academics';
  } else if (/(?:metro|bus|auto|uber|ola|rapido|irctc|train|railway|petrol|fuel|hpcl|bpcl|ioc|flight|indigo|toll|fastag|transit|commute|cab)/i.test(fullText)) {
    category = 'travel';
  } else if (/(?:rent|hostel|pg|paying guest|landlord|room|maintenance|electricity|bescom|water|gas|cylinder|laundry|wifi|broadband|dorm)/i.test(fullText)) {
    category = 'housing';
  } else if (/(?:amazon|flipkart|myntra|zara|h&m|meesho|nykaa|mall|ajio|salon|barber|clothes|shoes|apparel|electronics|gadget)/i.test(fullText)) {
    category = 'shopping';
  } else if (/(?:pharmacy|medical|medicine|apollo|1mg|pharmeasy|hospital|clinic|doctor|lab|diagnostics|gym|fitness|cultfit|protein)/i.test(fullText)) {
    category = 'health';
  }

  return {
    amount,
    merchant,
    category,
    type
  };
}

/**
 * Handle FinArt & SMS Gateway REST API
 */
async function handleApiRequest(req, res, pathname, queryParams) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return true;
  }

  // 1. Gateway Status & Connection Information
  if (req.method === 'GET' && pathname === '/api/sms/gateway-info') {
    const lanIp = getLocalIp();
    sendJson(res, 200, {
      status: 'active',
      service: 'FinArt & SMS Gateway Hub',
      port: currentPort,
      lanIp,
      webhookUrls: {
        localhost: `http://localhost:${currentPort}/api/sms/webhook`,
        lan: `http://${lanIp}:${currentPort}/api/sms/webhook`,
        finartAlias: `http://localhost:${currentPort}/api/finart/webhook`
      },
      stats: {
        pendingCount: incomingMessages.length,
        historyCount: historyLog.length
      }
    });
    return true;
  }

  // 2. Incoming SMS Webhook (Standard SMS forwarder, FinArt, Tasker, or MacroDroid)
  if (req.method === 'POST' && (
    pathname === '/api/sms/webhook' || 
    pathname === '/api/finart/webhook' || 
    pathname === '/api/sms-gateway'
  )) {
    try {
      const payload = await readRequestBody(req);

      // Check if structured transaction payload from FinArt
      const isStructured = payload.amount !== undefined && (payload.merchant || payload.category);

      // Extract message text from common SMS gateway formats
      let rawText = payload.message || payload.text || payload.sms || payload.body || payload.content || '';
      if (!rawText && isStructured) {
        rawText = `${payload.type === 'credit' ? 'Received' : 'Paid'} ₹${payload.amount} at ${payload.merchant || 'Merchant'}${payload.balance ? ` (Avl Bal: ₹${payload.balance})` : ''}`;
      }

      const sender = payload.sender || payload.from || payload.address || payload.source || (isStructured ? 'FinArt API' : 'SMS Gateway');
      const timestamp = payload.timestamp || payload.date || new Date().toISOString();

      const gatewayEntry = {
        id: `gw_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        rawText: typeof rawText === 'string' ? rawText.trim() : JSON.stringify(rawText),
        sender,
        timestamp,
        receivedAt: new Date().toISOString(),
        structured: isStructured ? {
          amount: Number(payload.amount),
          merchant: payload.merchant || 'Unknown Merchant',
          category: payload.category || 'misc',
          type: payload.type || 'debit',
          balance: payload.balance ? Number(payload.balance) : null,
          bank: payload.bank || sender
        } : null,
        headers: {
          userAgent: req.headers['user-agent'] || '',
          apiKeyProvided: !!(req.headers['authorization'] || req.headers['x-api-key'] || queryParams.get('token'))
        }
      };

      // Add to live queue and history
      incomingMessages.push(gatewayEntry);
      historyLog.unshift(gatewayEntry);
      if (historyLog.length > 50) {
        historyLog = historyLog.slice(0, 50);
      }

      console.log(`[SMS Gateway] Received incoming SMS from ${sender}: "${(gatewayEntry.rawText || '').slice(0, 60)}..."`);

      sendJson(res, 200, {
        success: true,
        message: 'SMS received and queued for Student Budget Tracker',
        id: gatewayEntry.id,
        receivedAt: gatewayEntry.receivedAt
      });
    } catch (err) {
      console.error('[SMS Gateway] Webhook Error:', err);
      sendJson(res, 400, { success: false, error: err.message });
    }
    return true;
  }

  // 3. Client Polling: GET /api/sms/poll
  if (req.method === 'GET' && pathname === '/api/sms/poll') {
    const markRead = queryParams.get('markRead') !== 'false';
    const since = queryParams.get('since');

    let messages = [];
    if (since) {
      messages = incomingMessages.filter(m => new Date(m.receivedAt) > new Date(since));
    } else {
      messages = [...incomingMessages];
    }

    if (markRead && !since) {
      incomingMessages = [];
    }

    sendJson(res, 200, {
      success: true,
      count: messages.length,
      messages
    });
    return true;
  }

  // 4. Gateway History Log: GET /api/sms/history
  if (req.method === 'GET' && pathname === '/api/sms/history') {
    sendJson(res, 200, {
      success: true,
      count: historyLog.length,
      history: historyLog
    });
    return true;
  }

  // 5. Test Simulator Webhook: POST /api/sms/test
  if (req.method === 'POST' && pathname === '/api/sms/test') {
    const randomSample = TEST_SMS_SAMPLES[Math.floor(Math.random() * TEST_SMS_SAMPLES.length)];
    const testEntry = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      rawText: randomSample,
      sender: 'VK-HDFCBK-TEST',
      timestamp: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      isSimulated: true,
      structured: null
    };

    incomingMessages.push(testEntry);
    historyLog.unshift(testEntry);
    if (historyLog.length > 50) {
      historyLog = historyLog.slice(0, 50);
    }

    console.log(`[SMS Gateway] Triggered simulated bank SMS: "${testEntry.rawText}"`);

    sendJson(res, 200, {
      success: true,
      message: 'Simulated bank SMS injected into gateway queue',
      entry: testEntry
    });
    return true;
  }

  // 6. Clear Gateway Queues: POST /api/sms/clear
  if (req.method === 'POST' && pathname === '/api/sms/clear') {
    incomingMessages = [];
    historyLog = [];
    sendJson(res, 200, { success: true, message: 'Gateway queues cleared' });
    return true;
  }

  // =========================================================
  // Android Notification Listener API
  // =========================================================

  // 7. Notification Gateway Info: GET /api/notifications/gateway-info
  if (req.method === 'GET' && (pathname === '/api/notifications/gateway-info' || pathname === '/api/notification/gateway-info')) {
    const lanIp = getLocalIp();
    sendJson(res, 200, {
      status: 'active',
      service: 'Android Notification Listener Hub',
      port: currentPort,
      lanIp,
      webhookUrls: {
        localhost: `http://localhost:${currentPort}/api/notifications/webhook`,
        lan: `http://${lanIp}:${currentPort}/api/notifications/webhook`
      },
      supportedApps: ['Google Pay', 'PhonePe', 'Paytm', 'CRED', 'BHIM UPI', 'HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Kotak'],
      stats: {
        pendingCount: incomingNotifications.length,
        historyCount: notificationHistoryLog.length
      },
      sampleTaskerPayload: {
        packageName: '%evtpkg',
        appName: '%evtpkglabel',
        title: '%evttitle',
        text: '%evttext',
        subText: '%evtsubtext',
        postTime: '%TIMEMS'
      }
    });
    return true;
  }

  // 8. Incoming Notification Webhook: POST /api/notifications/webhook
  if (req.method === 'POST' && (
    pathname === '/api/notifications/webhook' ||
    pathname === '/api/notification/webhook' ||
    pathname === '/api/notification/listener'
  )) {
    try {
      const payload = await readRequestBody(req);

      // Extract text content from various forwarder formats (Tasker, MacroDroid, Notification Forwarder)
      let text = payload.text || payload.notification_text || payload.content || payload.message || payload.body || '';
      let title = payload.title || payload.notification_title || payload.sender || '';
      let packageName = payload.packageName || payload.package || payload.appPackage || payload.sourcePackage || '';
      let appName = payload.appName || payload.app || payload.packageLabel || '';
      let subText = payload.subText || payload.sub_text || payload.bigText || '';
      let postTime = payload.postTime || payload.timestamp || payload.date || Date.now();

      // If text is empty but bigText or raw body has content
      if (!text && payload.bigText) text = payload.bigText;
      if (!text && payload._rawBody && typeof payload._rawBody === 'string') text = payload._rawBody;

      // Infer human app name from package name if omitted
      if (!appName && packageName) {
        if (packageName.includes('paisa') || packageName.includes('google')) appName = 'Google Pay';
        else if (packageName.includes('phonepe')) appName = 'PhonePe';
        else if (packageName.includes('paytm')) appName = 'Paytm';
        else if (packageName.includes('dreamplug') || packageName.includes('cred')) appName = 'CRED';
        else if (packageName.includes('bhim') || packageName.includes('npci')) appName = 'BHIM UPI';
        else if (packageName.includes('hdfc')) appName = 'HDFC Bank';
        else if (packageName.includes('sbi')) appName = 'SBI Bank';
        else if (packageName.includes('icici')) appName = 'ICICI Bank';
        else appName = packageName.split('.').pop() || 'Android App';
      }

      if (!appName && title) {
        appName = title;
      }

      const notifEntry = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        packageName,
        appName: appName || 'Android Notification',
        title: title || appName || 'Payment Alert',
        text: typeof text === 'string' ? text.trim() : JSON.stringify(text),
        subText: typeof subText === 'string' ? subText.trim() : '',
        timestamp: postTime,
        receivedAt: new Date().toISOString(),
        structured: categorizeNotificationServer(
          typeof text === 'string' ? text : '',
          typeof title === 'string' ? title : '',
          typeof subText === 'string' ? subText : '',
          appName || ''
        ),
        headers: {
          userAgent: req.headers['user-agent'] || '',
          apiKeyProvided: !!(req.headers['authorization'] || req.headers['x-api-key'] || queryParams.get('token'))
        }
      };

      incomingNotifications.push(notifEntry);
      notificationHistoryLog.unshift(notifEntry);
      if (notificationHistoryLog.length > 50) {
        notificationHistoryLog = notificationHistoryLog.slice(0, 50);
      }

      console.log(`[Notification Listener] Captured from ${notifEntry.appName}: "${(notifEntry.text || notifEntry.title || '').slice(0, 60)}"`);

      sendJson(res, 200, {
        success: true,
        message: 'Notification captured and queued for Student Budget Tracker',
        id: notifEntry.id,
        receivedAt: notifEntry.receivedAt
      });
    } catch (err) {
      console.error('[Notification Listener] Webhook Error:', err);
      sendJson(res, 400, { success: false, error: err.message });
    }
    return true;
  }

  // 9. Client Notification Polling: GET /api/notifications/poll
  if (req.method === 'GET' && (pathname === '/api/notifications/poll' || pathname === '/api/notification/poll')) {
    const markRead = queryParams.get('markRead') !== 'false';
    const since = queryParams.get('since');

    let notifications = [];
    if (since) {
      notifications = incomingNotifications.filter(n => new Date(n.receivedAt) > new Date(since));
    } else {
      notifications = [...incomingNotifications];
    }

    if (markRead && !since) {
      incomingNotifications = [];
    }

    sendJson(res, 200, {
      success: true,
      count: notifications.length,
      notifications
    });
    return true;
  }

  // 10. Notification History Log: GET /api/notifications/history
  if (req.method === 'GET' && (pathname === '/api/notifications/history' || pathname === '/api/notification/history')) {
    sendJson(res, 200, {
      success: true,
      count: notificationHistoryLog.length,
      history: notificationHistoryLog
    });
    return true;
  }

  // 11. Test Notification Simulator: POST /api/notifications/test
  if (req.method === 'POST' && (pathname === '/api/notifications/test' || pathname === '/api/notification/test')) {
    let sample = null;
    const body = await readRequestBody(req);

    if (body && body.index !== undefined && TEST_NOTIFICATION_SAMPLES[body.index]) {
      sample = TEST_NOTIFICATION_SAMPLES[body.index];
    } else if (body && body.text) {
      sample = {
        packageName: body.packageName || 'com.google.android.apps.nbu.paisa.user',
        appName: body.appName || 'Google Pay',
        title: body.title || 'Google Pay',
        text: body.text,
        subText: body.subText || 'Manual Simulation'
      };
    } else {
      sample = TEST_NOTIFICATION_SAMPLES[Math.floor(Math.random() * TEST_NOTIFICATION_SAMPLES.length)];
    }

    const testNotifEntry = {
      id: `notif_test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      packageName: sample.packageName,
      appName: sample.appName,
      title: sample.title,
      text: sample.text,
      subText: sample.subText || '',
      timestamp: Date.now(),
      receivedAt: new Date().toISOString(),
      isSimulated: true,
      structured: categorizeNotificationServer(sample.text, sample.title, sample.subText || '', sample.appName)
    };

    incomingNotifications.push(testNotifEntry);
    notificationHistoryLog.unshift(testNotifEntry);
    if (notificationHistoryLog.length > 50) {
      notificationHistoryLog = notificationHistoryLog.slice(0, 50);
    }

    console.log(`[Notification Listener] Injected simulated notification from ${testNotifEntry.appName}: "${testNotifEntry.text}"`);

    sendJson(res, 200, {
      success: true,
      message: 'Simulated Android notification injected into queue',
      entry: testNotifEntry
    });
    return true;
  }

  // 12. Clear Notification Queues: POST /api/notifications/clear
  if (req.method === 'POST' && (pathname === '/api/notifications/clear' || pathname === '/api/notification/clear')) {
    incomingNotifications = [];
    notificationHistoryLog = [];
    sendJson(res, 200, { success: true, message: 'Notification queues cleared' });
    return true;
  }

  return false; // Not handled by API
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const queryParams = parsedUrl.searchParams;

  // Check if API endpoint
  if (pathname.startsWith('/api/')) {
    const handled = await handleApiRequest(req, res, pathname, queryParams);
    if (handled) return;

    sendJson(res, 404, { error: `API endpoint ${pathname} not found` });
    return;
  }

  // Static File Serving
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(ROOT, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

function startListening(port) {
  server.listen(port, () => {
    currentPort = port;
    const lanIp = getLocalIp();
    console.log(`\n======================================================`);
    console.log(`🎓 Student Budget Tracker & AI Category Sensor Running!`);
    console.log(`📡 Local Web URL:     http://localhost:${currentPort}`);
    console.log(`📱 SMS Gateway URL:   http://localhost:${currentPort}/api/sms/webhook`);
    console.log(`🔔 Notification URL:  http://localhost:${currentPort}/api/notifications/webhook`);
    console.log(`📶 Phone / Wi-Fi URL: http://${lanIp}:${currentPort}/api/notifications/webhook`);
    console.log(`======================================================\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Server] Port ${currentPort} in use, automatically trying port ${currentPort + 1}...`);
    currentPort += 1;
    setTimeout(() => startListening(currentPort), 150);
  } else {
    console.error('[Server Error]:', err);
  }
});

startListening(currentPort);
