/**
 * AI Financial Advisor & Transaction Responder Engine
 * Provides:
 * 1. Instant AI feedback/reactions on sensed transactions
 * 2. Proactive student savings suggestions and 50/30/20 budget analysis
 * 3. Daily safe-to-spend calculations
 * 4. Dual-mode AI chat assistant (Built-in context-aware engine + optional Google Gemini API)
 */

class AiAdvisor {
  /**
   * Generates an immediate AI reaction/response when a transaction is detected
   */
  static generateTransactionReaction(txn, state) {
    const { type, amount, merchant, category, categoryDetails } = txn;
    const catName = categoryDetails ? categoryDetails.name : category;
    const currentBalance = state.totalBalance || 0;
    const budget = state.budgets ? (state.budgets[category] || 3000) : 3000;
    const currentCatSpend = (state.categorySpends && state.categorySpends[category]) ? state.categorySpends[category] : 0;
    const newCatSpend = type === 'debit' ? currentCatSpend + amount : currentCatSpend;
    const budgetPct = Math.round((newCatSpend / budget) * 100);

    // 1. Income / Allowance Reaction
    if (type === 'credit') {
      const suggestedSaving = Math.round(amount * 0.20);
      return {
        tone: 'celebratory',
        icon: '🎉',
        title: 'Allowance / Inflow Sensed!',
        message: `Received ₹${amount.toLocaleString('en-IN')} from ${merchant}. Student tip: Automatically tuck away ₹${suggestedSaving.toLocaleString('en-IN')} (20%) into your Savings Goal before starting your monthly expenses!`,
        action: 'Allocate to Savings',
        impact: `Balance increased to ₹${(currentBalance + amount).toLocaleString('en-IN')}`
      };
    }

    // 2. Overbudget Warning
    if (budgetPct >= 100) {
      return {
        tone: 'danger',
        icon: '🚨',
        title: `Budget Exceeded in ${catName}`,
        message: `This ₹${amount.toLocaleString('en-IN')} purchase at ${merchant} pushed your ${catName} spending to ${budgetPct}% (₹${newCatSpend.toLocaleString('en-IN')} of ₹${budget.toLocaleString('en-IN')} budget). Freeze non-essential spends in this category for the rest of the week!`,
        action: 'Review Category Spend',
        impact: `Over budget by ₹${(newCatSpend - budget).toLocaleString('en-IN')}`
      };
    }

    // 3. Near Budget Warning (75% - 99%)
    if (budgetPct >= 75) {
      return {
        tone: 'warning',
        icon: '⚠️',
        title: `Caution: ${catName} at ${budgetPct}%`,
        message: `₹${amount.toLocaleString('en-IN')} spent at ${merchant}. You have only ₹${(budget - newCatSpend).toLocaleString('en-IN')} remaining in your ${catName} budget for this month.`,
        action: 'View Spending Limit',
        impact: `${100 - budgetPct}% remaining in category`
      };
    }

    // 4. Category-specific intelligent student insights
    if (category === 'food') {
      if (amount > 400) {
        return {
          tone: 'insight',
          icon: '💡',
          title: 'Food Delivery Sensed',
          message: `₹${amount.toLocaleString('en-IN')} spent at ${merchant}. Ordering out frequently adds up fast for college students. Cooking dinner or dining at the campus mess tomorrow could save you ~₹300!`,
          action: 'Food Budget Tracker',
          impact: `${budgetPct}% of monthly food budget used`
        };
      }
      return {
        tone: 'neutral',
        icon: '🍔',
        title: 'Food Transaction Logged',
        message: `₹${amount.toLocaleString('en-IN')} at ${merchant} registered smoothly. You have ₹${(budget - newCatSpend).toLocaleString('en-IN')} safe food allowance remaining.`,
        action: 'Looks Good',
        impact: 'Within safe limits'
      };
    }

    if (category === 'entertainment') {
      return {
        tone: 'insight',
        icon: '🎬',
        title: 'Entertainment Expense',
        message: `₹${amount.toLocaleString('en-IN')} for ${merchant}. Student tip: Look into student pricing (Spotify Student 50% off, Prime Student) or split streaming accounts with roommates!`,
        action: 'Explore Student Discounts',
        impact: `Remaining leisure budget: ₹${(budget - newCatSpend).toLocaleString('en-IN')}`
      };
    }

    if (category === 'academics') {
      return {
        tone: 'positive',
        icon: '📚',
        title: 'Academic Investment',
        message: `₹${amount.toLocaleString('en-IN')} invested in ${merchant}. Great investment in your education! Remember to check your college library or senior batches for textbook rentals.`,
        action: 'Tax/Invoice Logged',
        impact: `${budgetPct}% of academic fund used`
      };
    }

    if (category === 'travel') {
      return {
        tone: 'neutral',
        icon: '🚌',
        title: 'Transit Expense',
        message: `₹${amount.toLocaleString('en-IN')} commute expense at ${merchant}. Tip: Check if a student monthly metro/bus transit pass saves you 30% on daily rides.`,
        action: 'Transit Stats',
        impact: `${budgetPct}% of travel budget`
      };
    }

    // Default friendly transaction response
    return {
      tone: 'neutral',
      icon: '✅',
      title: 'Transaction Processed',
      message: `₹${amount.toLocaleString('en-IN')} paid to ${merchant}. AI classified as ${catName} (${budgetPct}% of budget utilized).`,
      action: 'Transaction Recorded',
      impact: `Updated balance: ₹${(currentBalance - amount).toLocaleString('en-IN')}`
    };
  }

  /**
   * Generates prioritized student savings suggestions based on active spending trends
   */
  static generateSavingsSuggestions(state) {
    const suggestions = [];
    const totalSpent = state.totalSpent || 0;
    const balance = state.totalBalance || 0;
    const catSpends = state.categorySpends || {};
    const daysLeft = state.daysRemainingInMonth || 15;
    const safeDaily = state.dailySafeSpend || 350;

    // 1. Safe Daily Spending Insight
    suggestions.push({
      id: 'daily_safe',
      icon: '🎯',
      category: 'Budget Health',
      title: `Daily Safe Limit: ₹${Math.round(safeDaily)}/day`,
      description: `With ${daysLeft} days left and your remaining budget, spending less than ₹${Math.round(safeDaily)} per day keeps you 100% debt-free this month.`,
      potentialSaving: `₹${Math.round(safeDaily * 5)} buffer`,
      difficulty: 'Easy'
    });

    // 2. High Food & Dining Spend
    const foodSpend = catSpends['food'] || 0;
    if (foodSpend > 2500) {
      const deliverySaving = Math.round(foodSpend * 0.3);
      suggestions.push({
        id: 'food_cut',
        icon: '🍳',
        category: 'Food & Dining',
        title: 'Dine-Out & Delivery Optimization',
        description: `You've spent ₹${foodSpend.toLocaleString('en-IN')} on food. Replacing just two delivery orders a week with campus mess meals can save you ₹${deliverySaving.toLocaleString('en-IN')} this month.`,
        potentialSaving: `₹${deliverySaving.toLocaleString('en-IN')}/mo`,
        difficulty: 'Medium'
      });
    }

    // 3. Entertainment & Subscriptions
    const entSpend = catSpends['entertainment'] || 0;
    if (entSpend > 500) {
      suggestions.push({
        id: 'sub_audit',
        icon: '📱',
        category: 'Subscriptions',
        title: 'Activate Student Discounts',
        description: 'Verify your student email (.edu / .ac.in) on Spotify, Apple Music, and Amazon Prime to get up to 50% instant discount on subscriptions.',
        potentialSaving: '₹350/mo',
        difficulty: 'Easy'
      });
    }

    // 4. Academic & Textbook Savings
    suggestions.push({
      id: 'books_save',
      icon: '📖',
      category: 'Academics',
      title: 'Digital & Senior Book Exchange',
      description: 'Before purchasing new engineering/medical textbooks, check your college senior groups, PDF repositories, or university library reservations.',
      potentialSaving: '₹1,500/semester',
      difficulty: 'Easy'
    });

    // 5. Commute & Transit Pass
    const travelSpend = catSpends['travel'] || 0;
    if (travelSpend > 800) {
      suggestions.push({
        id: 'travel_pass',
        icon: '🚇',
        category: 'Travel',
        title: 'Concession / Student Metro Card',
        description: 'You frequently spend on transit. Look into applying for a student metro/bus smart pass which offers subsidized student travel tariffs.',
        potentialSaving: '₹400/mo',
        difficulty: 'Medium'
      });
    }

    // 6. 50/30/20 Student Rule
    suggestions.push({
      id: 'student_rule',
      icon: '⚖️',
      category: 'Financial Habit',
      title: 'Student 50/30/20 Rule',
      description: 'Aim to divide your monthly allowance: 50% for Needs (Mess, PG rent, Books), 30% for Wants (Outings, Streaming), and 20% for Emergency Savings.',
      potentialSaving: 'Build ₹3,000 emergency fund',
      difficulty: 'Recommended'
    });

    return suggestions;
  }

  /**
   * Evaluates Student 50/30/20 Financial Breakdown
   */
  static calculate50_30_20(state) {
    const catSpends = state.categorySpends || {};
    const income = state.monthlyAllowance || 15000;

    // Needs: Housing, Academics, Travel, Health, Utilities
    const needs = (catSpends['housing'] || 0) + 
                  (catSpends['academics'] || 0) + 
                  (catSpends['travel'] || 0) + 
                  (catSpends['health'] || 0) + 
                  (catSpends['utilities'] || 0) + 
                  ((catSpends['food'] || 0) * 0.6); // 60% of food is basic necessity

    // Wants: Entertainment, Shopping, 40% of Food (eating out/orders)
    const wants = (catSpends['entertainment'] || 0) + 
                  (catSpends['shopping'] || 0) + 
                  (catSpends['misc'] || 0) + 
                  ((catSpends['food'] || 0) * 0.4);

    const totalSpent = state.totalSpent || 0;
    const savings = Math.max(0, income - totalSpent);

    const targetNeeds = income * 0.50;
    const targetWants = income * 0.30;
    const targetSavings = income * 0.20;

    return {
      needs: { actual: needs, target: targetNeeds, pct: income ? Math.round((needs / income) * 100) : 0 },
      wants: { actual: wants, target: targetWants, pct: income ? Math.round((wants / income) * 100) : 0 },
      savings: { actual: savings, target: targetSavings, pct: income ? Math.round((savings / income) * 100) : 0 }
    };
  }

  /**
   * Handles interactive conversational AI chat
   * Supports live LLM AI Bot (Gemini, OpenAI, or Universal LLM) with multi-turn context
   * and high-speed offline built-in intelligent financial assistant with Goal & Reminder actions.
   */
  static async askAi(userQuery, state, apiKey = null, chatHistory = [], appState = null) {
    if (!userQuery || userQuery.trim().length === 0) {
      return "Please enter a question about your transactions, budget, savings, goals, or reminders for LLM AI Bot!";
    }

    const targetState = appState || state.appState || (state.addGoal ? state : null);

    // 1. Direct high-speed intent detection for Adding/Setting/Removing Goals and Reminders
    const directActionResponse = this.handleGoalOrReminderAction(userQuery, targetState, state);
    if (directActionResponse) {
      return directActionResponse;
    }

    // 2. If user provided an API Key, call live LLM AI Bot API
    if (apiKey && apiKey.trim().length > 8) {
      try {
        const response = await this._callLlmApi(userQuery, state, apiKey, chatHistory, targetState);
        if (response) return response;
      } catch (err) {
        console.warn('LLM AI API request error, falling back to built-in LLM AI engine:', err);
      }
    }

    // 3. High-speed built-in intelligent context engine
    return this._generateBuiltInResponse(userQuery, state, targetState);
  }

  /**
   * Parses natural language commands to add, set, or remove Savings Goals and Reminders ("remainder")
   */
  static handleGoalOrReminderAction(query, targetState, state) {
    if (!targetState) return null;
    const q = query.trim();
    const qLower = q.toLowerCase();

    // ==========================================
    // 1. ADD SAVINGS GOAL
    // e.g.: "add goal Tech Fund 15000", "create goal Laptop Upgrade ₹50,000", "new goal Summer Trip target 8000"
    // ==========================================
    if (/^(?:add|create|set\s+up|new)\s+(?:a\s+)?(?:savings\s+)?goal\b/i.test(qLower)) {
      let rest = q.replace(/^(?:add|create|set\s+up|new)\s+(?:a\s+)?(?:savings\s+)?goal\s*(?:for|named|called)?\s*/i, '').trim();

      let target = 10000;
      let current = 0;

      // Check if target amount is specified
      const targetMatch = rest.match(/(?:target|target\s+of|target\s+is|of|worth)?\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)\s*(?:target)?$/i) 
                       || rest.match(/(?:₹|rs\.?|inr)\s*(\d[\d,]*)/i);

      let title = rest;
      if (targetMatch) {
        target = parseFloat(targetMatch[1].replace(/,/g, '')) || 10000;
        title = rest.replace(targetMatch[0], '').replace(/\b(?:with|target|of|for|₹|rs\.?|inr)\b/gi, '').trim();
      }

      // Check if current was specified, e.g. "current 2000" or "saved 2000"
      const currentMatch = q.match(/(?:saved|current|starting\s+with|have)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
      if (currentMatch) {
        current = parseFloat(currentMatch[1].replace(/,/g, '')) || 0;
      }

      title = title.replace(/^["']|["']$/g, '').trim() || 'Savings Goal';
      const res = targetState.addGoal(title, target, current);

      const daysLeft = state.daysRemainingInMonth || 15;
      const dailyToSave = Math.round((target - current) / (daysLeft || 1));

      return `🎯 **Savings Goal Created Successfully!**\n\n` +
             `• **Goal Name:** ${res.goal.title}\n` +
             `• **Target Amount:** ₹${res.goal.target.toLocaleString('en-IN')}\n` +
             `• **Current Progress:** ₹${res.goal.current.toLocaleString('en-IN')} (${Math.round((res.goal.current / res.goal.target) * 100)}%)\n\n` +
             `💡 *Student Pacing Tip:* Saving just **₹${dailyToSave}/day** over the remaining ${daysLeft} days will hit this target. I have pinned it to your dashboard's active Savings Goals!`;
    }

    // ==========================================
    // 2. SET / UPDATE SAVINGS GOAL
    // e.g.: "set goal Laptop Upgrade target 50000", "set goal Tech Fund current 4000", "update goal Tech Fund 18000", "add 1000 to Laptop goal"
    // ==========================================
    if (/^(?:set|update|modify)\s+(?:the\s+)?(?:savings\s+)?goal\b/i.test(qLower) ||
        /^(?:add|deposit|put)\s+(?:₹|rs\.?|inr)?\s*(\d[\d,]*)\s*(?:to|in|into)\s+(?:goal\s+)?(.*)/i.test(qLower)) {

      // Quick deposit pattern: "add 1000 to Laptop goal"
      const depMatch = q.match(/^(?:add|deposit|put)\s+(?:₹|rs\.?|inr)?\s*(\d[\d,]*)\s*(?:to|in|into)\s+(?:goal\s+)?(.*)/i);
      if (depMatch) {
        const addAmt = parseFloat(depMatch[1].replace(/,/g, ''));
        const goalIdent = depMatch[2].replace(/\bgoal\b/gi, '').trim();
        const res = targetState.setGoal(goalIdent, { addCurrent: addAmt });
        if (res.success) {
          return `🎉 **Savings Goal Updated!**\n\nAdded **₹${addAmt.toLocaleString('en-IN')}** to **${res.goal.title}**!\n• New Progress: ₹${res.goal.current.toLocaleString('en-IN')} of ₹${res.goal.target.toLocaleString('en-IN')} (${Math.round((res.goal.current / res.goal.target) * 100)}% complete). Great job!`;
        }
        return `⚠️ ${res.message}`;
      }

      // "set goal <name> target/current <amount>"
      let rest = q.replace(/^(?:set|update|modify)\s+(?:the\s+)?(?:savings\s+)?goal\s*/i, '').trim();

      let isCurrent = qLower.includes('current') || qLower.includes('saved') || qLower.includes('progress');

      const amtMatch = rest.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]+)/i);
      const amt = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : null;

      let identifier = rest;
      if (amtMatch) {
        identifier = rest.replace(amtMatch[0], '').replace(/\b(?:target|current|to|saved|of|as|₹|rs\.?|inr)\b/gi, '').trim();
      }

      identifier = identifier.replace(/^["']|["']$/g, '').trim();
      if (!identifier && (targetState.savingsGoals || []).length === 1) {
        identifier = targetState.savingsGoals[0].id;
      }

      const updates = {};
      if (isCurrent && amt !== null) {
        updates.current = amt;
      } else if (amt !== null) {
        updates.target = amt;
      }

      const res = targetState.setGoal(identifier, updates);
      if (res.success) {
        return `✅ **Savings Goal Updated!**\n\n${res.message}\n• Current Progress: ₹${res.goal.current.toLocaleString('en-IN')} / ₹${res.goal.target.toLocaleString('en-IN')} (${Math.round((res.goal.current / res.goal.target) * 100)}%)`;
      }
      return `⚠️ ${res.message}`;
    }

    // ==========================================
    // 3. REMOVE / DELETE SAVINGS GOAL
    // e.g.: "remove goal Tech Fund", "delete goal Laptop Upgrade", "cancel goal Semester Trip"
    // ==========================================
    if (/^(?:remove|delete|cancel|clear|drop)\s+(?:the\s+)?(?:savings\s+)?goal\b/i.test(qLower)) {
      const identifier = q.replace(/^(?:remove|delete|cancel|clear|drop)\s+(?:the\s+)?(?:savings\s+)?goal\s*(?:named|called)?\s*/i, '').replace(/^["']|["']$/g, '').trim();
      const res = targetState.removeGoal(identifier);
      if (res.success) {
        return `🗑️ **Savings Goal Removed:**\n\nSuccessfully deleted **${res.goal.title}** from your active savings tracker.`;
      }
      return `⚠️ ${res.message}`;
    }

    // ==========================================
    // 4. ADD REMINDER / REMAINDER
    // e.g.: "add reminder Hostel Rent 5500 due 1st", "remind me to pay wifi recharge 299 on 15th", "add remainder exam fee 1200"
    // ==========================================
    if (/^(?:add|create|set\s+up|new)\s+(?:a\s+)?(?:bill\s+)?(?:reminder|remainder)\b/i.test(qLower) ||
        /^remind\s+me\s+(?:to\s+)?/i.test(qLower)) {
      let rest = q.replace(/^(?:add|create|set\s+up|new)\s+(?:a\s+)?(?:bill\s+)?(?:reminder|remainder)\s*(?:for|to|named)?\s*/i, '')
                  .replace(/^remind\s+me\s+(?:to\s+)?/i, '')
                  .trim();

      // Extract amount
      let amount = 0;
      const amtMatch = rest.match(/(?:₹|rs\.?|inr)?\s*(\d[\d,]*)(?:\s*(?:rs|inr|\/-))?/i);
      if (amtMatch) {
        amount = parseFloat(amtMatch[1].replace(/,/g, '')) || 0;
        rest = rest.replace(amtMatch[0], '');
      }

      // Extract due date (e.g. "due 1st", "due on 5th", "on 15th", "tomorrow", "every month")
      let dueDate = 'Upcoming';
      const dateMatch = rest.match(/(?:due\s+(?:on|by|at)?|on|by|before)\s+([a-z0-9\s/.-]+)$/i)
                     || rest.match(/\b(tomorrow|tonight|next\s+\w+|every\s+month|\d{1,2}(?:st|nd|rd|th)?(?:\s+(?:of\s+)?\w+)?)\b/i);
      if (dateMatch) {
        dueDate = dateMatch[0].replace(/^(?:due\s+(?:on|by|at)?|on|by|before)\s+/i, '').trim();
        rest = rest.replace(dateMatch[0], '');
      }

      let title = rest.replace(/\b(?:due|on|by|for|amount|bill|pay|payment|₹|rs\.?|inr)\b/gi, '')
                      .replace(/\s+/g, ' ')
                      .replace(/^["']|["']$/g, '')
                      .trim() || 'Bill Reminder';

      // Pick an icon based on title
      let icon = '🔔';
      let cat = 'misc';
      const tLower = title.toLowerCase();
      if (tLower.includes('rent') || tLower.includes('pg') || tLower.includes('hostel')) { icon = '🏠'; cat = 'housing'; }
      else if (tLower.includes('wifi') || tLower.includes('recharge') || tLower.includes('electric') || tLower.includes('phone')) { icon = '⚡'; cat = 'utilities'; }
      else if (tLower.includes('exam') || tLower.includes('fee') || tLower.includes('book') || tLower.includes('college') || tLower.includes('tuition')) { icon = '📚'; cat = 'academics'; }
      else if (tLower.includes('mess') || tLower.includes('food') || tLower.includes('tiffin')) { icon = '🍔'; cat = 'food'; }
      else if (tLower.includes('netflix') || tLower.includes('spotify') || tLower.includes('prime')) { icon = '🎬'; cat = 'entertainment'; }

      const res = targetState.addReminder(title, amount, dueDate, icon, cat);
      return `🔔 **Reminder Set Successfully!**\n\n` +
             `• **Reminder:** ${res.reminder.icon} ${res.reminder.title}\n` +
             `• **Amount Due:** ₹${res.reminder.amount.toLocaleString('en-IN')}\n` +
             `• **Due Date:** ${res.reminder.dueDate}\n` +
             `• **Status:** ⏳ Pending\n\n` +
             `I have logged this in your **Reminders & Bill Alerts** section. I will keep track of it for you!`;
    }

    // ==========================================
    // 5. SET / MARK REMINDER (e.g. "mark reminder wifi recharge done", "set reminder rent completed", "set remainder exam fee paid")
    // ==========================================
    if (/(?:mark|set)\s+(?:the\s+)?(?:reminder|remainder)\b.*?(?:done|completed|paid|finished|pending)/i.test(qLower) ||
        /^(?:set|update)\s+(?:the\s+)?(?:reminder|remainder)\b/i.test(qLower)) {

      const isDone = /done|completed|paid|finished/i.test(qLower);
      const isPending = /pending|unpaid|undone/i.test(qLower);

      let identifier = q.replace(/^(?:mark|set|update)\s+(?:the\s+)?(?:reminder|remainder)\s*/i, '')
                        .replace(/\b(?:as|to|is)?\s*(?:done|completed|paid|finished|pending|unpaid|undone)\b/gi, '')
                        .replace(/^["']|["']$/g, '')
                        .trim();

      const updates = {};
      if (isDone) updates.isCompleted = true;
      if (isPending) updates.isCompleted = false;

      const res = targetState.setReminder(identifier, updates);
      if (res.success) {
        return `✅ **Reminder Updated!**\n\n${res.message}`;
      }
      return `⚠️ ${res.message}`;
    }

    // ==========================================
    // 6. REMOVE / DELETE REMINDER ("remainder")
    // e.g.: "remove reminder wifi recharge", "delete reminder rent", "remove remainder exam fee"
    // ==========================================
    if (/^(?:remove|delete|cancel|clear|drop)\s+(?:the\s+)?(?:bill\s+)?(?:reminder|remainder)\b/i.test(qLower)) {
      const identifier = q.replace(/^(?:remove|delete|cancel|clear|drop)\s+(?:the\s+)?(?:bill\s+)?(?:reminder|remainder)\s*(?:named|called)?\s*/i, '')
                          .replace(/^["']|["']$/g, '')
                          .trim();
      const res = targetState.removeReminder(identifier);
      if (res.success) {
        return `🗑️ **Reminder Removed:**\n\nSuccessfully deleted reminder **${res.reminder.title}** from your bill alerts.`;
      }
      return `⚠️ ${res.message}`;
    }

    // ==========================================
    // 7. SHOW / LIST REMINDERS ("remainders")
    // e.g.: "show reminders", "list reminders", "show remainders", "what reminders do i have", "my bills"
    // ==========================================
    if (/(?:show|list|view|what\s+are)\s+(?:my\s+)?(?:reminders|remainders|bills)/i.test(qLower) ||
        qLower === 'reminders' || qLower === 'remainders' || qLower === 'my reminders') {
      const rems = targetState.reminders || [];
      if (rems.length === 0) {
        return `🔔 **Reminders & Bill Alerts:**\n\nYou have no active reminders! You can say *"Add reminder Wi-Fi recharge ₹299 on 15th"* to create one.`;
      }
      let text = `🔔 **Your Reminders & Bill Alerts (${rems.length}):**\n\n`;
      rems.forEach(r => {
        const status = r.isCompleted ? '✅ Paid' : '⏳ Pending';
        text += `• **${r.icon || '🔔'} ${r.title}:** ₹${(r.amount || 0).toLocaleString('en-IN')} — Due *${r.dueDate}* [${status}]\n`;
      });
      text += `\n💡 *Tip: Tell me "Mark reminder [Name] done" when paid or "Remove reminder [Name]" to delete.*`;
      return text;
    }

    return null;
  }

  /**
   * Generates a comprehensive, personalized student savings report formatted in Markdown
   */
  static generatePersonalizedSavingsAdvice(state) {
    const suggestions = this.generateSavingsSuggestions(state);
    const balance = state.totalBalance || 0;
    const spent = state.totalSpent || 0;
    const allowance = state.monthlyAllowance || 15000;
    const daysLeft = state.daysRemainingInMonth || 15;
    const safeDaily = state.dailySafeSpend || 350;
    const goals = state.savingsGoals || [];
    const reminders = state.reminders || [];

    let report = `💡 **Personalized Student Savings & Budget Suggestions**\n\n`;
    report += `*Based on your live balance (₹${balance.toLocaleString('en-IN')}) and ${daysLeft} days remaining in this month:*\n\n`;

    suggestions.forEach((s, idx) => {
      report += `### ${idx + 1}. ${s.icon} ${s.title}\n`;
      report += `${s.description}\n`;
      report += `💰 **Potential Savings:** \`${s.potentialSaving}\` | **Effort:** *${s.difficulty}*\n\n`;
    });

    if (goals.length > 0) {
      report += `🎯 **Accelerating Your Savings Goals:**\n`;
      goals.forEach(g => {
        const remaining = Math.max(0, g.target - g.current);
        const pct = Math.min(100, Math.round((g.current / g.target) * 100));
        const dailyToHit = Math.round(remaining / (daysLeft || 1));
        report += `• **${g.icon} ${g.title}:** ₹${g.current.toLocaleString('en-IN')} of ₹${g.target.toLocaleString('en-IN')} (${pct}% complete). Saving just **₹${dailyToHit}/day** reaches this goal by month-end!\n`;
      });
      report += `\n`;
    }

    const pendingReminders = reminders.filter(r => !r.isCompleted);
    if (pendingReminders.length > 0) {
      report += `🔔 **Upcoming Bill Reminders to Plan For:**\n`;
      pendingReminders.forEach(r => {
        report += `• **${r.icon || '🔔'} ${r.title}:** ₹${(r.amount || 0).toLocaleString('en-IN')} (Due: *${r.dueDate}*)\n`;
      });
      report += `\n`;
    }

    report += `✨ *Tip: Keep daily spends under ₹${Math.round(safeDaily)}/day to finish the month with surplus allowance!*`;
    return report;
  }

  /**
   * Built-in context-aware financial engine response generator
   */
  static _generateBuiltInResponse(query, state, targetState = null) {
    const q = query.toLowerCase();
    const balance = state.totalBalance || 0;
    const spent = state.totalSpent || 0;
    const allowance = state.monthlyAllowance || 15000;
    const catSpends = state.categorySpends || {};
    const safeDaily = state.dailySafeSpend || 350;
    const daysLeft = state.daysRemainingInMonth || 15;
    const goals = state.savingsGoals || [];
    const reminders = state.reminders || [];

    // Check for goal/reminder action first
    const actionResult = this.handleGoalOrReminderAction(query, targetState || state.appState, state);
    if (actionResult) return actionResult;

    // 0. Bot Capabilities / Help
    if (q.includes('help') || q.includes('what can you do') || q.includes('command') || q.includes('feature')) {
      return `🤖 **LLM AI Student Budget Bot Capabilities:**\n\n` +
             `Here is what you can ask me:\n\n` +
             `💡 **Savings Suggestions & Pacing:**\n` +
             `• *"Give me personalized savings suggestions"*\n` +
             `• *"How can I cut expenses on food and Swiggy?"*\n` +
             `• *"What is my daily safe spending limit?"*\n` +
             `• *"What is my 50/30/20 budget breakdown?"*\n\n` +
             `🎯 **Savings Goals Management:**\n` +
             `• *"Add goal Tech Fund ₹15,000"*\n` +
             `• *"Set goal Laptop Upgrade target ₹50,000"*\n` +
             `• *"Add ₹1,000 to Laptop goal"*\n` +
             `• *"Remove goal Tech Fund"*\n\n` +
             `🔔 **Reminders & Bill Alerts ("Remainder"):**\n` +
             `• *"Add reminder Hostel Rent ₹5,500 due on 1st"*\n` +
             `• *"Remind me to pay Wi-Fi recharge ₹299 on 15th"*\n` +
             `• *"Mark reminder Hostel Rent done"*\n` +
             `• *"Show my reminders"*\n` +
             `• *"Remove reminder Wi-Fi recharge"*\n\n` +
             `💳 **Financial Q&A & Affordability:**\n` +
             `• *"Can I afford dinner for ₹600 tonight?"*\n` +
             `• *"How much have I spent on food this month?"*\n` +
             `• *"What is my highest expense category?"*`;
    }

    // 1. Savings suggestions / How to save money
    if (q.includes('save') || q.includes('savings') || q.includes('suggestion') || q.includes('cut cost') || q.includes('saving tip') || q.includes('how to save')) {
      return this.generatePersonalizedSavingsAdvice(state);
    }

    // 2. Inquiries about Food & Dining
    if (q.includes('food') || q.includes('swiggy') || q.includes('zomato') || q.includes('eat') || q.includes('canteen') || q.includes('dining')) {
      const foodSpend = catSpends['food'] || 0;
      const pct = Math.round((foodSpend / (spent || 1)) * 100);
      return `🍔 **Food & Dining Analysis:**\n\nYou have spent **₹${foodSpend.toLocaleString('en-IN')}** on food and dining this month (${pct}% of your total expenses).\n\n💡 **Actionable Tips to Save on Food:**\n• **Campus Mess vs Delivery:** Replacing just 2 delivery orders with campus mess meals saves ~₹400/week (₹1,600/month).\n• **BOGO & Group Dining:** Split bulk orders or combo meals with roommates on Swiggy/Zomato to split delivery fees.\n• **Snack Stash:** Keep peanut butter, bread, and instant oats in your dorm room for late-night study cravings.`;
    }

    // 3. Inquiries about Entertainment & Theater
    if (q.includes('entertainment') || q.includes('movie') || q.includes('theater') || q.includes('theatre') || q.includes('pvr') || q.includes('cinema') || q.includes('netflix') || q.includes('spotify')) {
      const entSpend = catSpends['entertainment'] || 0;
      return `🎬 **Entertainment & Theater Spend:**\n\nYou've spent **₹${entSpend.toLocaleString('en-IN')}** on leisure, movies, and entertainment this month.\n\n🍿 **Student Savings Hacks:**\n• **Weekday Matinee Shows:** PVR/Inox tickets are often 40-50% cheaper on Wednesday/Thursday morning shows compared to weekend prime slots.\n• **Student Streaming Subscriptions:** Spotify Student is ₹59/month (50% off), Prime Student offers 50% cashback, and YouTube Premium has student verification!\n• **College Drama & Clubs:** Campus cultural fests and college screenings are free or negligible cost!`;
    }

    // 4. Inquiries about Academics, Books, and Fees
    if (q.includes('academic') || q.includes('book') || q.includes('college') || q.includes('course') || q.includes('study') || q.includes('xerox')) {
      const acadSpend = catSpends['academics'] || 0;
      return `📚 **Academics & Study Expenses:**\n\nYou have spent **₹${acadSpend.toLocaleString('en-IN')}** on books, stationery, and academics.\n\n📖 **Smart Study Hacks:**\n• Borrow textbooks from university library course reserves or senior batches instead of purchasing brand new editions.\n• Use digital PDF readers with split-screen note taking.\n• Bulk print project reports in university student unions rather than commercial print centers to save 60%.`;
    }

    // 5. Inquiries about Commute & Travel
    if (q.includes('travel') || q.includes('commute') || q.includes('metro') || q.includes('bus') || q.includes('uber') || q.includes('ola') || q.includes('rapido')) {
      const travelSpend = catSpends['travel'] || 0;
      return `🚌 **Travel & Commute Overview:**\n\nYou have spent **₹${travelSpend.toLocaleString('en-IN')}** on transit this month.\n\n🚇 **Commute Savings Tips:**\n• Apply for a Student Concession Metro/Bus Smart Card for subsidized daily fares.\n• For campus trips, bike pool or share auto rickshaws with batchmates.\n• Bike/scooter rentals or campus cycles offer huge savings over cab rides.`;
    }

    // 6. Can I afford X? / Going out questions
    if (q.includes('afford') || q.includes('can i buy') || q.includes('can i spend') || q.includes('go out') || q.includes('weekend')) {
      const remainingBudget = Math.max(0, allowance - spent);
      const match = q.match(/(?:rs\.?|inr|₹)?\s*(\d[\d,]*)/i);
      const askedAmt = match ? parseFloat(match[1].replace(/,/g, '')) : null;

      if (askedAmt) {
        if (askedAmt <= safeDaily * 1.5 && remainingBudget >= askedAmt) {
          return `✅ **Affordability Verdict: Yes, You Can Afford ₹${askedAmt.toLocaleString('en-IN')}!**\n\n• Remaining Allowance: **₹${remainingBudget.toLocaleString('en-IN')}**\n• Days Remaining: **${daysLeft} days**\n• Daily Safe Allowance: **₹${Math.round(safeDaily)}/day**\n\nSpending ₹${askedAmt.toLocaleString('en-IN')} leaves you with ₹${(remainingBudget - askedAmt).toLocaleString('en-IN')}, setting a new safe pace of **₹${Math.round((remainingBudget - askedAmt) / daysLeft)}/day**. You will stay comfortably on track!`;
        } else if (remainingBudget >= askedAmt) {
          return `⚠️ **Affordability Verdict: Caution on ₹${askedAmt.toLocaleString('en-IN')}**\n\n• Remaining Allowance: **₹${remainingBudget.toLocaleString('en-IN')}**\n• Daily Safe Allowance: **₹${Math.round(safeDaily)}/day**\n\nWhile you have enough balance, spending ₹${askedAmt.toLocaleString('en-IN')} consumes **${Math.round((askedAmt / remainingBudget) * 100)}%** of your remaining cash. Your daily safe limit will drop to **₹${Math.round((remainingBudget - askedAmt) / daysLeft)}/day**. If it's a non-essential want, consider waiting or splitting costs!`;
        } else {
          return `🚨 **Affordability Verdict: Not Recommended**\n\nYou have **₹${remainingBudget.toLocaleString('en-IN')}** remaining, which is less than the requested ₹${askedAmt.toLocaleString('en-IN')}. Spending this would exceed your monthly allowance by ₹${(askedAmt - remainingBudget).toLocaleString('en-IN')}!`;
        }
      }

      if (remainingBudget > 3000) {
        return `✅ **Affordability Check:**\n\nYou currently have **₹${remainingBudget.toLocaleString('en-IN')}** left in this month's budget across **${daysLeft} days** (Safe daily limit: **₹${Math.round(safeDaily)}/day**).\n\nA casual hangout of ₹400–₹800 fits comfortably in your plan!`;
      } else {
        return `⚠️ **Affordability Check:**\n\nYour remaining monthly allowance is tight: **₹${remainingBudget.toLocaleString('en-IN')}** for the next **${daysLeft} days** (~**₹${Math.round(safeDaily)}/day**). Try low-cost or free campus activities this week!`;
      }
    }

    // 7. 50/30/20 Rule Breakdown
    if (q.includes('50/30/20') || q.includes('rule') || q.includes('ratio') || q.includes('habits')) {
      const breakdown = this.calculate50_30_20(state);
      return `⚖️ **Student 50/30/20 Budget Breakdown:**\n\n• **Needs (50% Target: ₹${breakdown.needs.target.toLocaleString('en-IN')}):** Spent ₹${breakdown.needs.actual.toLocaleString('en-IN')} (${breakdown.needs.pct}% of allowance) — *Rent, Mess, Books, Transit, Utilities*\n• **Wants (30% Target: ₹${breakdown.wants.target.toLocaleString('en-IN')}):** Spent ₹${breakdown.wants.actual.toLocaleString('en-IN')} (${breakdown.wants.pct}% of allowance) — *Dining out, Movies & Theater, Shopping*\n• **Savings (20% Target: ₹${breakdown.savings.target.toLocaleString('en-IN')}):** Remaining ₹${breakdown.savings.actual.toLocaleString('en-IN')} (${breakdown.savings.pct}% of allowance) — *Emergency fund & Goals*\n\n${breakdown.wants.pct > 30 ? '⚠️ *Your Wants spending is above 30%. Consider reigning in dining or subscriptions!*' : '✅ *Your balance between Needs and Wants is healthy!*'}`;
    }

    // 8. Savings Goals Status
    if (q.includes('goal') || q.includes('laptop') || q.includes('emergency') || q.includes('trip')) {
      if (goals.length === 0) {
        return "You have no active savings goals set! You can say *\"Add goal Tech Fund ₹15000\"* to create one right now.";
      }
      let msg = `🎯 **Your Active Savings Goals (${goals.length}):**\n\n`;
      goals.forEach(g => {
        const pct = Math.min(100, Math.round((g.current / g.target) * 100));
        msg += `• **${g.icon} ${g.title}:** ₹${g.current.toLocaleString('en-IN')} / ₹${g.target.toLocaleString('en-IN')} (${pct}%)\n`;
      });
      msg += `\n💡 *Tip: Tell me "Add ₹500 to [Goal]" or "Remove goal [Goal]" to update!*`;
      return msg;
    }

    // 9. Reminders / Remainders Status
    if (q.includes('reminder') || q.includes('remainder') || q.includes('bill') || q.includes('due')) {
      if (reminders.length === 0) {
        return "You have no bill reminders set! Say *\"Add reminder Hostel Rent 5500 on 1st\"* to create one.";
      }
      let msg = `🔔 **Your Bill Reminders (${reminders.length}):**\n\n`;
      reminders.forEach(r => {
        const status = r.isCompleted ? '✅ Paid' : '⏳ Pending';
        msg += `• **${r.icon || '🔔'} ${r.title}:** ₹${(r.amount || 0).toLocaleString('en-IN')} (Due: *${r.dueDate}*) — ${status}\n`;
      });
      msg += `\n💡 *Tip: Tell me "Mark reminder [Name] done" or "Remove reminder [Name]".*`;
      return msg;
    }

    // 10. Account balance & overview
    if (q.includes('balance') || q.includes('how much money') || q.includes('account') || q.includes('funds') || q.includes('overview')) {
      return `💳 **Account Financial Health:**\n\n- **Live Balance:** ₹${balance.toLocaleString('en-IN')}\n- **Monthly Allowance:** ₹${allowance.toLocaleString('en-IN')}\n- **Total Spent So Far:** ₹${spent.toLocaleString('en-IN')} (${Math.round((spent / (allowance || 1)) * 100)}%)\n- **Remaining Budget:** ₹${Math.max(0, allowance - spent).toLocaleString('en-IN')}\n- **Safe Daily Spend:** ₹${Math.round(safeDaily)}/day across ${daysLeft} days remaining.`;
    }

    // 11. Category breakdown & highest spend
    if (q.includes('category') || q.includes('breakdown') || q.includes('where is my money') || q.includes('highest')) {
      const sorted = Object.entries(catSpends).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) {
        return "No transactions have been recorded yet! Connect the Android Notification Listener or SMS gateway to see instant category breakdowns.";
      }
      const topCat = sorted[0];
      const itemsList = sorted.slice(0, 5).map(([cat, amt]) => `• **${cat.toUpperCase()}:** ₹${amt.toLocaleString('en-IN')} (${Math.round((amt / (spent || 1)) * 100)}%)`).join('\n');
      return `📊 **Expense Breakdown by Category:**\n\nYour highest expenditure is **${topCat[0].toUpperCase()}** at ₹${topCat[1].toLocaleString('en-IN')}.\n\n${itemsList}\n\n💡 Focus on curbing your top 2 categories to save maximum money!`;
    }

    // Default intelligent assistant response
    return `🤖 **LLM AI Student Budget Bot:**\n\nHere is your financial status:\n• Account Balance: **₹${balance.toLocaleString('en-IN')}**\n• Month's Outflow: **₹${spent.toLocaleString('en-IN')}** (${Math.round((spent / (allowance || 1)) * 100)}% of allowance)\n• Safe Daily Pacing: **₹${Math.round(safeDaily)}/day** (${daysLeft} days remaining)\n\nYou can ask me:\n- *"Give me personalized savings suggestions"*\n- *"Add goal Tech Fund ₹15,000"*\n- *"Add reminder Hostel Rent ₹5,500 due 1st"*\n- *"Can I afford dinner out tonight?"*\n- *"What is my 50/30/20 budget breakdown?"*`;
  }

  /**
   * Parses action tags from Cloud LLMs (Gemini / OpenAI) and mutates targetState
   */
  static executeActionTags(text, targetState) {
    if (!text || !targetState) return text;
    const actionRegex = /\[ACTION:(ADD_GOAL|SET_GOAL|REMOVE_GOAL|ADD_REMINDER|SET_REMINDER|REMOVE_REMINDER)\s+({.*?})\]/gi;
    let match;
    while ((match = actionRegex.exec(text)) !== null) {
      try {
        const actionType = match[1].toUpperCase();
        const payload = JSON.parse(match[2]);
        if (actionType === 'ADD_GOAL') {
          targetState.addGoal(payload.title, payload.target, payload.current);
        } else if (actionType === 'SET_GOAL') {
          targetState.setGoal(payload.identifier, payload);
        } else if (actionType === 'REMOVE_GOAL') {
          targetState.removeGoal(payload.identifier);
        } else if (actionType === 'ADD_REMINDER') {
          targetState.addReminder(payload.title, payload.amount, payload.dueDate);
        } else if (actionType === 'SET_REMINDER') {
          targetState.setReminder(payload.identifier, payload);
        } else if (actionType === 'REMOVE_REMINDER') {
          targetState.removeReminder(payload.identifier);
        }
      } catch (e) {
        console.warn('Failed to parse action tag:', e);
      }
    }
    return text.replace(actionRegex, '').trim();
  }

  /**
   * Calls live LLM AI API (OpenAI-compatible or Google Gemini) with multi-turn conversation support and financial telemetry
   */
  static async _callLlmApi(prompt, state, apiKey, chatHistory = [], targetState = null) {
    const key = apiKey.trim();

    const systemInstruction = `
You are the LLM AI Student Financial Co-Pilot and Budget Bot for a college student.
Your mission is to help them manage their money wisely, identify saving opportunities, and answer questions about their budget.
Be encouraging, concise, actionable, and witty. Use formatting (bullet points, bold figures, emojis).

Live Student Financial Data:
- Current Bank Balance: ₹${state.totalBalance}
- Monthly Student Allowance: ₹${state.monthlyAllowance}
- Total Spent This Month: ₹${state.totalSpent}
- Remaining Budget: ₹${Math.max(0, (state.monthlyAllowance || 15000) - (state.totalSpent || 0))}
- Safe Daily Spending Limit: ₹${Math.round(state.dailySafeSpend || 350)}/day
- Days Remaining in Month: ${state.daysRemainingInMonth || 15}
- Category Breakdown: ${JSON.stringify(state.categorySpends || {})}
- Active Savings Goals: ${JSON.stringify((state.savingsGoals || []).map(g => ({ title: g.title, current: g.current, target: g.target })))}
- Bill Reminders: ${JSON.stringify((state.reminders || []).map(r => ({ title: r.title, amount: r.amount, dueDate: r.dueDate, isCompleted: r.isCompleted })))}
- Recent Transactions: ${JSON.stringify((state.transactions || []).slice(0, 6).map(t => ({ merchant: t.merchant, amount: t.amount, category: t.category, type: t.type })))}

Interactive Goal & Reminder Management:
You have the power to add, update, and remove Savings Goals and Bill Reminders/Remainders for the user!
When the user requests adding, modifying, or deleting a goal or reminder, execute it by appending the appropriate action tag at the very end of your response:
- To add a goal: [ACTION:ADD_GOAL {"title": "Tech Fund", "target": 15000, "current": 0}]
- To set/update a goal: [ACTION:SET_GOAL {"identifier": "Tech Fund", "target": 18000, "current": 3000}]
- To remove a goal: [ACTION:REMOVE_GOAL {"identifier": "Tech Fund"}]
- To add a reminder: [ACTION:ADD_REMINDER {"title": "Hostel Rent", "amount": 5500, "dueDate": "1st"}]
- To set a reminder completed: [ACTION:SET_REMINDER {"identifier": "Hostel Rent", "isCompleted": true}]
- To remove a reminder: [ACTION:REMOVE_REMINDER {"identifier": "Hostel Rent"}]

Guidelines:
1. Always reference their actual numbers when answering questions about their balance, spending, or affordability.
2. Provide concrete, realistic college student savings advice (mess food vs Zomato, student discount passes, textbook exchange, weekday movie matinees).
3. If they ask if they can afford something, calculate the impact on their safe daily allowance for the rest of the month.
4. Keep answers friendly, practical, and under 3-4 paragraphs.
`;

    // 1. If key is OpenAI format (starts with sk-)
    if (key.startsWith('sk-')) {
      try {
        const messages = [
          { role: 'system', content: systemInstruction }
        ];
        const recentHistory = chatHistory.slice(-6);
        recentHistory.forEach(msg => {
          messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.text
          });
        });
        messages.push({ role: 'user', content: prompt });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: 800,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.choices && data.choices[0] && data.choices[0].message) {
            return this.executeActionTags(data.choices[0].message.content, targetState);
          }
        }
      } catch (err) {
        console.warn('[LLM AI OpenAI API] Error:', err);
      }
    }

    // 2. Default: Google Gemini / Generative Language API
    const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];

    const contents = [];
    const recentHistory = chatHistory.slice(-6);
    recentHistory.forEach(msg => {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    });
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    for (const modelName of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            return this.executeActionTags(data.candidates[0].content.parts[0].text, targetState);
          }
        }
      } catch (e) {
        console.warn(`[LLM AI Bot] Failed with ${modelName}:`, e);
      }
    }

    return null;
  }

  static async _callGeminiApi(prompt, state, apiKey, chatHistory = [], targetState = null) {
    return this._callLlmApi(prompt, state, apiKey, chatHistory, targetState);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AiAdvisor };
}
