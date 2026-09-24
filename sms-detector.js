/**
 * AI SMS & Category Sensor Engine
 * Parses incoming bank/fintech/UPI SMS and senses transaction details with high accuracy:
 * Amount, Currency, Merchant, Transaction Type (Debit/Credit), Available Balance,
 * and AI Category classification with confidence scores and reasoning.
 */

const CATEGORIES = {
  FOOD: {
    id: 'food',
    name: 'Food & Dining',
    icon: '🍔',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    keywords: [
      'swiggy', 'zomato', 'canteen', 'mess', 'cafe', 'coffee', 'starbucks', 
      'mcdonalds', 'kfc', 'dominos', 'pizza', 'burger', 'dhaba', 'tea', 'chai', 
      'restaurant', 'dining', 'bake', 'bakery', 'blinkit', 'zepto', 'instamart', 
      'bigbasket', 'grocery', 'supermarket', 'eats', 'subway', 'snack', 'food'
    ]
  },
  ACADEMICS: {
    id: 'academics',
    name: 'Academics & Books',
    icon: '📚',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    keywords: [
      'book', 'bookstore', 'college', 'university', 'tuition', 'library', 'stationary', 
      'stationery', 'xerox', 'print', 'printing', 'udemy', 'coursera', 'course', 
      'exam', 'fee', 'tuition', 'classes', 'chem', 'lab', 'academic', 'textbook'
    ]
  },
  HOUSING: {
    id: 'housing',
    name: 'Housing & Living',
    icon: '🏠',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.15)',
    keywords: [
      'rent', 'hostel', 'pg', 'paying guest', 'landlord', 'room', 'maintenance', 
      'electricity', 'bescom', 'water', 'gas', 'cylinder', 'laundry', 'wifi', 
      'broadband', 'act fibernet', 'dorm'
    ]
  },
  TRAVEL: {
    id: 'travel',
    name: 'Travel & Commute',
    icon: '🚌',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.15)',
    keywords: [
      'metro', 'bus', 'auto', 'uber', 'ola', 'rapido', 'irctc', 'train', 
      'railway', 'petrol', 'fuel', 'hpcl', 'bpcl', 'ioc', 'flight', 'indigo', 
      'toll', 'fastag', 'transit', 'commute', 'cab'
    ]
  },
  ENTERTAINMENT: {
    id: 'entertainment',
    name: 'Entertainment & Theater',
    icon: '🎬',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    keywords: [
      'theater', 'theatre', 'movie theater', 'cinema', 'movie', 'pvr', 'inox', 
      'cinepolis', 'multiplex', 'imax', 'broadway', 'play', 'drama', 'stage',
      'netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'bookmyshow', 'steam', 
      'playstation', 'gaming', 'discord', 'pub', 'club', 'party', 'weekend', 'concert', 'game'
    ]
  },
  SHOPPING: {
    id: 'shopping',
    name: 'Shopping & Personal',
    icon: '🛍️',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'meesho', 'nykaa', 'mall', 
      'ajio', 'tata cliq', 'salon', 'barber', 'spa', 'clothes', 'shoes', 
      'apparel', 'electronics', 'gadget'
    ]
  },
  HEALTH: {
    id: 'health',
    name: 'Health & Wellness',
    icon: '💊',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    keywords: [
      'pharmacy', 'medical', 'medicine', 'apollo', '1mg', 'pharmeasy', 'hospital', 
      'clinic', 'doctor', 'lab', 'diagnostics', 'gym', 'fitness', 'cult.fit', 
      'cultfit', 'protein'
    ]
  },
  INCOME: {
    id: 'income',
    name: 'Income & Allowance',
    icon: '💰',
    color: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.15)',
    keywords: [
      'allowance', 'pocket money', 'dad', 'mom', 'father', 'mother', 'stipend', 
      'salary', 'scholarship', 'cashback', 'refund', 'interest', 'credited by', 
      'credited', 'credited with', 'credited to', 'received', 'received from',
      'payment received', 'money received', 'amount received', 'paid you', 'sent you',
      'transferred you', 'deposit', 'deposited', 'inflow', 'incoming', 'internship', 'freelance'
    ]
  },
  UTILITIES: {
    id: 'utilities',
    name: 'Recharge & Bills',
    icon: '⚡',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.15)',
    keywords: [
      'recharge', 'jio', 'airtel', 'vi', 'vodafone', 'prepaid', 'postpaid', 
      'billdesk', 'phonepe recharge', 'paytm bill', 'dth', 'tata sky'
    ]
  },
  MISC: {
    id: 'misc',
    name: 'Miscellaneous',
    icon: '📦',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.15)',
    keywords: ['atm', 'cash', 'transfer', 'charges', 'others', 'miscellaneous']
  }
};

/**
 * Realistic Student SMS Presets for testing & simulation
 */
const STUDENT_SMS_PRESETS = [
  {
    title: '🍔 Swiggy Food Order',
    sms: 'Dear Customer, your a/c ending 4821 is debited by INR 320.00 on 21-Sep-26 at SWIGGY BANGALORE via UPI Ref 6291829102. Avl Bal: INR 8,450.00 - HDFC Bank'
  },
  {
    title: '📚 College Bookstore',
    sms: 'Rs 1,450.00 debited from a/c XX9012 on 21-Sep-26 at CAMPUS BOOK DEPOT for Engineering Mathematics Vol 2. Avl balance: Rs 7,000.00 - SBI'
  },
  {
    title: '💰 Monthly Parent Allowance',
    sms: 'Your a/c XX4821 is credited with INR 15,000.00 on 21-Sep-26 by VPA rajesh.sharma@okaxis (Monthly Allowance Dad). Updated Avl Bal: INR 22,000.00 - HDFC Bank'
  },
  {
    title: '☕ Campus Canteen Lunch',
    sms: 'Paid Rs. 85.00 to CAMPUS CANTEEN UPI: canteen.ju@okicici on 21-Sep-26 at 13:15. UPI Ref 38192019. Balance: Rs 6,915.00'
  },
  {
    title: '🚇 Metro Smart Card Recharge',
    sms: 'INR 400.00 debited from your A/c ending 4821 towards DMRC METRO AUTO TOPUP on 21-Sep-26. Avl Bal: INR 6,515.00 - ICICI Bank'
  },
  {
    title: '🏠 Student PG / Hostel Rent',
    sms: 'Sent Rs. 6,500.00 to ASHOK KUMAR (PG OWNER) via Google Pay on 21-Sep-26 for Sept Room Rent. A/c debited. Avl Bal: Rs 15,500.00'
  },
  {
    title: '🎬 Netflix Student Plan',
    sms: 'Your Card ending 1092 was charged INR 199.00 on 21-Sep-26 at NETFLIX MUMBAI. Avl Bal: INR 6,316.00 - Axis Bank'
  },
  {
    title: '🍎 Zepto Dorm Snacks & Fruits',
    sms: 'Debited INR 245.00 from A/C XX4821 at ZEPTO INSTANT GROCERY on 21-Sep-26. Avl Bal: INR 6,071.00 - HDFC'
  },
  {
    title: '💊 Apollo Pharmacy Meds',
    sms: 'Txn of INR 180.00 done on Card 4821 at APOLLO PHARMACY on 21-Sep-26. Avl Bal: INR 5,891.00'
  },
  {
    title: '💻 Freelance / Stipend Credit',
    sms: 'Account 9012 CREDITED with INR 4,500.00 on 21-Sep-26 for Campus Web Dev Project. Bal: INR 10,391.00'
  },
  {
    title: '🎭 Movie Theater Tickets',
    sms: 'Rs 350.00 debited from A/C *4821 at PVR CINEMAS THEATER on 22-Sep-26 via UPI. Avl Bal: INR 10,041.00'
  }
];

class SmsSensorEngine {
  /**
   * Senses and extracts transaction details from raw SMS/Messenger string.
   */
  static parse(smsText) {
    if (!smsText || typeof smsText !== 'string' || smsText.trim().length === 0) {
      return null;
    }

    const cleanText = smsText.replace(/\r?\n|\r/g, ' ').trim();
    const lower = cleanText.toLowerCase();

    // 1. Detect Transaction Type (Debit vs Credit)
    const typeInfo = this._detectType(lower);

    // 2. Detect Amount & Currency
    const amountInfo = this._detectAmount(cleanText);

    // 3. Detect Available Balance
    const balanceInfo = this._detectBalance(cleanText);

    // 4. Detect Merchant / Payee
    const merchantInfo = this._detectMerchant(cleanText, lower, typeInfo.type);

    // 5. Detect Payment Mode / Bank
    const bankInfo = this._detectBankAndMode(cleanText, lower);

    // 6. SENSE CATEGORY using AI Category Sensor
    const categoryInfo = this.senseCategory(merchantInfo.merchant, cleanText, typeInfo.type);

    return {
      id: 'txn_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      rawText: cleanText,
      type: typeInfo.type, // 'debit' | 'credit'
      typeConfidence: typeInfo.confidence,
      amount: amountInfo.amount,
      currency: amountInfo.currency || '₹',
      formattedAmount: `${amountInfo.currency || '₹'}${amountInfo.amount ? amountInfo.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`,
      merchant: merchantInfo.merchant || (typeInfo.type === 'credit' ? 'Bank Deposit / Allowance' : 'Personal Transfer'),
      merchantClean: merchantInfo.cleanName,
      category: categoryInfo.category,
      categoryDetails: categoryInfo.details,
      confidence: categoryInfo.confidence,
      reasoning: categoryInfo.reasoning,
      alternativeCategories: categoryInfo.alternatives,
      accountBalance: balanceInfo.balance,
      bank: bankInfo.bank,
      paymentMode: bankInfo.mode,
      accountNumber: bankInfo.accountNumber,
      date: new Date().toISOString(),
      source: 'sms_sensor'
    };
  }

  /**
   * Dedicated AI Category Sensor: Evaluates merchant name and full text context
   */
  static senseCategory(merchant = '', fullText = '', txnType = 'debit') {
    const textLower = (fullText + ' ' + merchant).toLowerCase();
    const isCredit = txnType === 'credit';
    const scores = {};

    // Initialize scores
    Object.keys(CATEGORIES).forEach(key => {
      scores[key] = {
        score: 0,
        matches: [],
        category: CATEGORIES[key]
      };
    });

    // Score based on keywords
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      // If debit, skip matching INCOME keywords (outgoing transfers to dad/mom are expenses, not income)
      if (!isCredit && key === 'INCOME') {
        return;
      }

      cat.keywords.forEach(kw => {
        // High boost if merchant contains keyword
        if (merchant && merchant.toLowerCase().includes(kw)) {
          scores[key].score += 4.0;
          scores[key].matches.push(`Merchant name '${kw}'`);
        }
        // Moderate boost if whole text contains keyword
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(textLower)) {
          scores[key].score += 2.0;
          if (!scores[key].matches.includes(kw)) {
            scores[key].matches.push(kw);
          }
        }
      });
    });

    // ALL credited SMS, received UPI payments, and inflows are categorized as INCOME!
    if (isCredit) {
      scores['INCOME'].score += 25.0;
      scores['INCOME'].matches.push('Credited / Received Income');
      return {
        category: CATEGORIES.INCOME.id,
        details: CATEGORIES.INCOME,
        confidence: 99,
        reasoning: 'Credited SMS / Received Income detected',
        alternatives: [
          { id: CATEGORIES.MISC.id, name: CATEGORIES.MISC.name, icon: CATEGORIES.MISC.icon, score: 2 }
        ]
      };
    }

    // Score based on keywords for debit / expense transactions
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      if (key === 'INCOME') return; // Debits are strictly NOT income

      cat.keywords.forEach(kw => {
        // High boost if merchant contains keyword
        if (merchant && merchant.toLowerCase().includes(kw)) {
          scores[key].score += 4.0;
          scores[key].matches.push(`Merchant name '${kw}'`);
        }
        // Moderate boost if whole text contains keyword
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(textLower)) {
          scores[key].score += 2.0;
          if (!scores[key].matches.includes(kw)) {
            scores[key].matches.push(kw);
          }
        }
      });
    });

    // Sort categories by score descending
    const sorted = Object.entries(scores)
      .filter(([_, data]) => data.score > 0)
      .sort((a, b) => b[1].score - a[1].score);

    if (sorted.length > 0) {
      const topMatch = sorted[0];
      const categoryObj = topMatch[1].category;
      
      // Calculate confidence (capped between 75% and 99%)
      const rawScore = topMatch[1].score;
      const confidence = Math.min(99, Math.max(78, Math.round(75 + rawScore * 4)));
      
      const reasons = topMatch[1].matches.length > 0 
        ? `Sensed via: ${topMatch[1].matches.slice(0, 3).join(', ')}`
        : `Matched pattern for ${categoryObj.name}`;

      const alternatives = sorted.slice(1, 4).map(([_, data]) => ({
        id: data.category.id,
        name: data.category.name,
        icon: data.category.icon,
        score: data.score
      }));

      return {
        category: categoryObj.id,
        details: categoryObj,
        confidence,
        reasoning: reasons,
        alternatives
      };
    }

    // Fallback if no specific keyword matched
    return {
      category: CATEGORIES.MISC.id,
      details: CATEGORIES.MISC,
      confidence: 65,
      reasoning: 'General transaction detected',
      alternatives: [
        { id: CATEGORIES.FOOD.id, name: CATEGORIES.FOOD.name, icon: CATEGORIES.FOOD.icon },
        { id: CATEGORIES.SHOPPING.id, name: CATEGORIES.SHOPPING.name, icon: CATEGORIES.SHOPPING.icon }
      ]
    };
  }

  /**
   * Detects Debit or Credit
   */
  static _detectType(lower) {
    // 1. Definite Credit / Inflow Phrases (check multi-word phrases first)
    const strongCreditPhrases = [
      'paid you', 'sent you', 'transferred you', 'transferred to your account',
      'credited with', 'credited by', 'credited to', 'credited for',
      'payment received', 'money received', 'amount received',
      'received from', 'received rs', 'received inr', 'received ₹',
      'added to your account', 'added to your wallet', 'refund of', 'cashback of',
      'salary credited', 'stipend credited', 'allowance'
    ];

    for (const phrase of strongCreditPhrases) {
      if (lower.includes(phrase)) {
        return { type: 'credit', confidence: 99 };
      }
    }

    const debitKeywords = ['debited', 'spent', 'paid to', 'paid for', 'sent to', 'transferred to', 'transfer to', 'charged', 'deducted', 'withdrawn', 'purchase', 'txn of', 'paid', 'sent', 'transfer'];
    const creditKeywords = ['credited', 'received', 'added to', 'refund', 'cashback', 'deposited', 'deposit', 'salary', 'stipend', 'inflow', 'inward'];

    let debitScore = 0;
    let creditScore = 0;

    creditKeywords.forEach(k => {
      if (new RegExp(`\\b${k}\\b`, 'i').test(lower)) creditScore += 3;
    });

    debitKeywords.forEach(k => {
      if ((k === 'paid' || k === 'sent') && (lower.includes('paid you') || lower.includes('sent you'))) {
        return;
      }
      if (new RegExp(`\\b${k}\\b`, 'i').test(lower)) debitScore += 2;
    });

    if (creditScore > debitScore || creditScore >= 3) {
      return { type: 'credit', confidence: 95 };
    }
    return { type: 'debit', confidence: debitScore > 0 ? 95 : 80 };
  }

  /**
   * Detects Amount and Currency Symbol
   */
  static _detectAmount(text) {
    // Regex for INR / Rs / ₹ / $ followed by numeric value
    const regexes = [
      /(?:inr|rs\.?|₹|\$)\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
      /(?:debited(?:\s+by)?|credited(?:\s+with)?|paid|sent)\s+(?:inr|rs\.?|₹|\$)?\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
      /([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:inr|rs\.?|₹)/i
    ];

    let currency = '₹';
    if (/\$|usd/i.test(text)) currency = '$';
    else if (/€|eur/i.test(text)) currency = '€';
    else if (/£|gbp/i.test(text)) currency = '£';

    for (const r of regexes) {
      const match = text.match(r);
      if (match && match[1]) {
        const cleanNum = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(cleanNum) && cleanNum > 0) {
          return { amount: cleanNum, currency };
        }
      }
    }

    // Generic fallback for standalone numbers
    const fallbackMatch = text.match(/\b([1-9][0-9]{1,6}(?:\.[0-9]{1,2})?)\b/);
    if (fallbackMatch && fallbackMatch[1]) {
      const cleanNum = parseFloat(fallbackMatch[1]);
      if (!isNaN(cleanNum) && cleanNum < 1000000) {
        return { amount: cleanNum, currency };
      }
    }

    return { amount: 0, currency };
  }

  /**
   * Detects Remaining / Available Account Balance if present
   */
  static _detectBalance(text) {
    const balRegex = /(?:avl\s*bal|available\s*balance|bal(?:ance)?(?:\s*is)?|updated\s*bal)[:\s]*(?:inr|rs\.?|₹|\$)?\s*([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i;
    const match = text.match(balRegex);
    if (match && match[1]) {
      const balNum = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(balNum)) {
        return { balance: balNum };
      }
    }
    return { balance: null };
  }

  /**
   * Extracts Merchant / Payee name
   */
  static _detectMerchant(text, lower, txnType) {
    const isCredit = txnType === 'credit';

    // 1. For credits / received money: look for "from <SENDER>", "by <SENDER>", "received from <SENDER>" FIRST!
    if (isCredit) {
      const fromMatch = text.match(/\b(?:from|by|received from)\s+(?:vpa\s*)?([A-Za-z0-9\s&'.-]{2,30}?)(?=\s+(?:on|via|for|ref|avl|bal|balance|dated|ref\s*no|txn|upi|\.|\-)|[\s.,;!?-]*$)/i);
      if (fromMatch && fromMatch[1]) {
        const m = this._cleanMerchantName(fromMatch[1]);
        if (m && !/^(?:google pay|gpay|phonepe|paytm|bhim|cred|upi|you|me)$/i.test(m)) {
          return { merchant: m, cleanName: m };
        }
      }
    }

    // 2. Family, Contact, & Relationship entities (e.g. "Dad", "Mom", "Landlord", etc.)
    const contactMatch = text.match(/\b(?:to|from|by|for)?\s*(dad|mom|father|mother|brother|bro|sister|sis|roommate|landlord|owner|bhai|uncle|aunty|cook|maid|driver|friend)\b/i);
    if (contactMatch && contactMatch[1]) {
      const m = this._cleanMerchantName(contactMatch[1]);
      if (m) return { merchant: m, cleanName: m };
    }

    // 3. Known prominent merchants & brands (exclude pure payment rails like Google Pay, PhonePe, Paytm, Cred so they don't override the sender/payee)
    const knownMerchants = [
      'Swiggy', 'Zomato', 'Amazon', 'Flipkart', 'Netflix', 'Spotify', 'Uber', 'Ola',
      'Rapido', 'Blinkit', 'Zepto', 'Instamart', 'BigBasket', 'McDonalds', 'KFC',
      'Dominos', 'Starbucks', 'Apollo Pharmacy', 'BookMyShow', 'DMRC Metro', 'IRCTC',
      'College Bookstore', 'Campus Canteen', 'Campus Book Depot', 'Myntra', 'Nykaa', 'Steam', 'YouTube',
      'Chai Point', 'Dunzo'
    ];

    for (const km of knownMerchants) {
      const regex = new RegExp(`\\b${km}\\b`, 'i');
      if (regex.test(lower)) {
        return { merchant: km, cleanName: km };
      }
    }

    // 4. Pattern: to / paid to / sent to / transfer to / transferred to <PAYEE>
    const toMatch = text.match(/\b(?:to|paid to|sent to|transfer to|transferred to|giving to|given to)\s+([A-Za-z0-9&'().\s-]{2,35}?)(?=\s+(?:via|on|for|ref|avl|bal|balance|dated|ref\s*no|txn|upi|rs\.?|inr|₹|[0-9]|\.|\-)|[\s.,;!?-]*$)/i);
    if (toMatch && toMatch[1]) {
      const m = this._cleanMerchantName(toMatch[1]);
      if (m && !/^(?:google pay|gpay|phonepe|paytm|bhim|cred|upi|you|me)$/i.test(m)) {
        return { merchant: m, cleanName: m };
      }
    }

    // 5. Pattern: at <MERCHANT>
    const atMatch = text.match(/\bat\s+([A-Za-z0-9\s&'().-]{2,35}?)(?=\s+(?:for|on|via|ref|avl|bal|balance|dated|ref\s*no|txn|upi|\.|\-)|[\s.,;!?-]*$)/i);
    if (atMatch && atMatch[1]) {
      const m = this._cleanMerchantName(atMatch[1]);
      if (m) return { merchant: m, cleanName: m };
    }

    // 6. Pattern: towards <PURPOSE/MERCHANT>
    const towardsMatch = text.match(/\btowards\s+([A-Za-z0-9\s&'().-]{2,35}?)(?=\s+(?:on|via|ref|avl|bal|balance|dated|ref\s*no|txn|upi|\.|\-)|[\s.,;!?-]*$)/i);
    if (towardsMatch && towardsMatch[1]) {
      const m = this._cleanMerchantName(towardsMatch[1]);
      if (m) return { merchant: m, cleanName: m };
    }

    // 7. Pattern: for <PURPOSE/MERCHANT>
    const forMatch = text.match(/\bfor\s+([A-Za-z0-9\s&'().-]{2,35}?)(?=\s+(?:on|via|ref|avl|bal|balance|dated|ref\s*no|txn|upi|\.|\-)|[\s.,;!?-]*$)/i);
    if (forMatch && forMatch[1]) {
      const m = this._cleanMerchantName(forMatch[1]);
      if (m) return { merchant: m, cleanName: m };
    }

    // 8. Pattern: by / from <SENDER> (especially for Credits / Inflows)
    const fromMatch = text.match(/\b(?:by|from|received from)\s+(?:vpa\s*)?([A-Za-z0-9\s&'.-]{2,30}?)(?=\s+(?:on|via|for|ref|avl|bal|balance|dated|ref\s*no|txn|upi|\.|\-)|[\s.,;!?-]*$)/i);
    if (fromMatch && fromMatch[1]) {
      const m = this._cleanMerchantName(fromMatch[1]);
      if (m && !/^(?:google pay|gpay|phonepe|paytm|bhim|cred|upi|you|me)$/i.test(m)) {
        return { merchant: m, cleanName: m };
      }
    }

    // 9. Pattern: After amount: e.g. "2000 to dad", "2000 dad", "Rs 500 Canteen"
    const amtFollowMatch = text.match(/\b(?:(?:rs\.?|inr|₹)\s*[\d,]+|[\d,]+(?:\.\d{1,2})?)\s+(?:to\s+)?([A-Za-z][A-Za-z0-9\s&'.-]{1,30}?)(?=\s+(?:via|on|for|ref|avl|bal|balance|dated|ref\s*no|txn|upi|\.|\-)|[\s.,;!?-]*$)/i);
    if (amtFollowMatch && amtFollowMatch[1]) {
      const m = this._cleanMerchantName(amtFollowMatch[1]);
      if (m && !/^(?:google pay|gpay|phonepe|paytm|bhim|cred|upi|you|me)$/i.test(m)) {
        return { merchant: m, cleanName: m };
      }
    }

    // 10. Pattern: Action recipient amount: e.g. "paid dad 2000", "transfer dad 2000", "sent ramesh 500"
    const actionMatch = text.match(/\b(?:transfer|transferred|send|sent|pay|paid|give|gave)\s+(?:to\s+)?([A-Za-z][A-Za-z0-9&'.-]{1,25})\s+(?:(?:rs\.?|inr|₹)\s*[\d,]+|[\d,]+)/i);
    if (actionMatch && actionMatch[1]) {
      const candidate = actionMatch[1].trim();
      if (!/^(?:you|me|us|to|for|him|her|them)$/i.test(candidate)) {
        const m = this._cleanMerchantName(candidate);
        if (m && !/^(?:google pay|gpay|phonepe|paytm|bhim|cred|upi|you|me)$/i.test(m)) {
          return { merchant: m, cleanName: m };
        }
      }
    }

    // 11. Pattern: VPA handle e.g. vpa rahul123@okaxis
    const vpaMatch = text.match(/(?:vpa|upi:?)\s*([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)/i);
    if (vpaMatch && vpaMatch[1]) {
      const vpa = vpaMatch[1];
      const handleName = vpa.split('@')[0].replace(/[0-9._-]/g, ' ').trim();
      if (handleName.length >= 2) {
        const capitalized = this._titleCase(handleName);
        return { merchant: `${capitalized} (UPI)`, cleanName: capitalized };
      }
      return { merchant: vpa, cleanName: vpa };
    }

    // 12. Credits fallback: if payment rail mentioned and no sender found
    if (isCredit) {
      if (/\b(?:google pay|gpay)\b/i.test(lower)) return { merchant: 'Google Pay Inflow', cleanName: 'Google Pay Inflow' };
      if (/\b(?:phonepe)\b/i.test(lower)) return { merchant: 'PhonePe Inflow', cleanName: 'PhonePe Inflow' };
      if (/\b(?:paytm)\b/i.test(lower)) return { merchant: 'Paytm Inflow', cleanName: 'Paytm Inflow' };
      if (/\b(?:cred)\b/i.test(lower)) return { merchant: 'CRED Inflow', cleanName: 'CRED Inflow' };
      return { merchant: 'Bank Deposit / Allowance', cleanName: 'Bank Deposit / Allowance' };
    }

    // Default fallback: Never return "Direct Payment"
    return {
      merchant: 'Personal Transfer',
      cleanName: 'Personal Transfer'
    };
  }

  static _cleanMerchantName(name) {
    if (!name) return '';
    let clean = name.trim();
    // Remove unwanted prefix words
    clean = clean.replace(/^(?:vpa\s+|info:\s*|towards\s+|account\s+|a\/c\s+|to\s+|from\s+|by\s+|my\s+|the\s+)/i, '');
    // Stop at bank or ref words
    clean = clean.split(/\b(ref|via|on|avl|bal|balance|upi|txn|dated|using|through)\b/i)[0];
    clean = clean.replace(/[.,;:\-_]+$/, '').trim();
    if (clean.length < 2) return '';
    // Discard if numeric or pure symbols
    if (/^[\d\s.,₹$]+$/.test(clean)) return '';
    // Discard account numbers / endings / card endings
    if (/^(?:your\s+account|account\s+ending|a\/c\s+ending|card\s+ending)/i.test(clean)) return '';
    // Discard common stop words and pronouns that are not names
    if (/^(?:via|ref|bal|balance|avl|upi|neft|rtgs|imps|account|a\/c|bank|card|online|cash|debited|credited|sent|received|paid|transfer|by|from|to|for|you|me|us|customer|dear|dear\s+customer)$/i.test(clean)) return '';

    return this._titleCase(clean);
  }

  static _titleCase(str) {
    if (!str) return '';
    return str.split(/\s+/).map(word => {
      // If word is in uppercase acronym (e.g. PG, UPI, PVR, KFC), preserve uppercase
      const stripped = word.replace(/[()]/g, '');
      if (stripped.length >= 2 && stripped.length <= 4 && stripped === stripped.toUpperCase()) {
        return word;
      }
      if (word.startsWith('(') && word.length > 2) {
        return '(' + word.charAt(1).toUpperCase() + word.slice(2).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
  }

  /**
   * Detects Bank & Payment channel
   */
  static _detectBankAndMode(text, lower) {
    let bank = 'Bank Account';
    let mode = 'UPI / Online';
    let accountNumber = null;

    const banks = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'PNB', 'Canara', 'Paytm Bank', 'Chase', 'Revolut'];
    for (const b of banks) {
      if (lower.includes(b.toLowerCase())) {
        bank = b + ' Bank';
        break;
      }
    }

    if (lower.includes('upi') || lower.includes('google pay') || lower.includes('phonepe') || lower.includes('paytm')) {
      mode = 'UPI';
    } else if (lower.includes('card') || lower.includes('debit card') || lower.includes('credit card')) {
      mode = 'Card';
    } else if (lower.includes('netbanking') || lower.includes('neft') || lower.includes('imps')) {
      mode = 'NetBanking';
    }

    const accMatch = text.match(/(?:a\/c|acct|card|ending)\s*(?:xx|x|\*)*([0-9]{3,4})/i);
    if (accMatch && accMatch[1]) {
      accountNumber = '•••• ' + accMatch[1];
    }

    return { bank, mode, accountNumber };
  }
}

if (typeof window !== 'undefined') {
  window.SmsSensorEngine = SmsSensorEngine;
  window.SmsDetector = SmsSensorEngine;
  window.CATEGORIES = CATEGORIES;
}

// Export for module/script usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATEGORIES, STUDENT_SMS_PRESETS, SmsSensorEngine, SmsDetector: SmsSensorEngine };
}
