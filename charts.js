/**
 * Modern Interactive SVG / Canvas Charts for Student Budget Tracker
 * Zero-dependency, lightweight, responsive, dark/light theme aware.
 */

class FinanceCharts {
  /**
   * Renders an interactive Category Donut Chart inside a container
   */
  static renderCategoryDonut(containerId, categoryBreakdown, totalSpend) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!categoryBreakdown || categoryBreakdown.length === 0 || totalSpend === 0) {
      container.innerHTML = `
        <div class="chart-empty-state">
          <div class="empty-icon">📊</div>
          <p>No expense transactions yet</p>
          <span>Transactions sensed from SMS will appear here</span>
        </div>
      `;
      return;
    }

    const size = 260;
    const strokeWidth = 36;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    let accumulatedAngle = -90; // Start at 12 o'clock
    let svgSegments = '';

    categoryBreakdown.forEach((item, index) => {
      const percentage = (item.amount / totalSpend);
      const strokeDashoffset = circumference * (1 - percentage);
      const rotate = accumulatedAngle;
      accumulatedAngle += percentage * 360;

      svgSegments += `
        <circle
          cx="${center}"
          cy="${center}"
          r="${radius}"
          fill="none"
          stroke="${item.color}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${strokeDashoffset}"
          transform="rotate(${rotate} ${center} ${center})"
          class="donut-segment"
          data-category="${item.name}"
          data-amount="₹${item.amount.toLocaleString('en-IN')}"
          data-percent="${Math.round(percentage * 100)}%"
        />
      `;
    });

    const formattedTotal = `₹${Math.round(totalSpend).toLocaleString('en-IN')}`;

    container.innerHTML = `
      <div class="donut-chart-wrapper">
        <svg class="donut-svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%">
          <circle
            cx="${center}"
            cy="${center}"
            r="${radius}"
            fill="none"
            stroke="var(--card-border)"
            stroke-width="${strokeWidth - 2}"
            opacity="0.25"
          />
          ${svgSegments}
        </svg>
        <div class="donut-center-info">
          <span class="donut-center-label">Total Spent</span>
          <span class="donut-center-val">${formattedTotal}</span>
          <span class="donut-center-sub">${categoryBreakdown.length} Categories</span>
        </div>
      </div>
      <div class="donut-legend">
        ${categoryBreakdown.map(item => `
          <div class="legend-item" title="${item.name}: ₹${item.amount.toLocaleString('en-IN')}">
            <span class="legend-dot" style="background-color: ${item.color};"></span>
            <span class="legend-name">${item.icon} ${item.name}</span>
            <span class="legend-amount">₹${item.amount.toLocaleString('en-IN')}</span>
            <span class="legend-pct">${Math.round((item.amount / totalSpend) * 100)}%</span>
          </div>
        `).join('')}
      </div>
    `;

    // Add interactive hover effects
    const segments = container.querySelectorAll('.donut-segment');
    const centerLabel = container.querySelector('.donut-center-label');
    const centerVal = container.querySelector('.donut-center-val');
    const centerSub = container.querySelector('.donut-center-sub');

    segments.forEach(seg => {
      seg.addEventListener('mouseenter', () => {
        const cat = seg.getAttribute('data-category');
        const amt = seg.getAttribute('data-amount');
        const pct = seg.getAttribute('data-percent');
        if (centerLabel && centerVal && centerSub) {
          centerLabel.textContent = cat;
          centerVal.textContent = amt;
          centerSub.textContent = `${pct} of monthly spend`;
        }
      });
      seg.addEventListener('mouseleave', () => {
        if (centerLabel && centerVal && centerSub) {
          centerLabel.textContent = 'Total Spent';
          centerVal.textContent = formattedTotal;
          centerSub.textContent = `${categoryBreakdown.length} Categories`;
        }
      });
    });
  }

  /**
   * Renders a 7-day spending velocity bar chart
   */
  static renderWeeklySpendBar(containerId, weeklyData, dailyAverageLimit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const maxSpend = Math.max(...weeklyData.map(d => d.amount), dailyAverageLimit * 1.5, 500);
    const height = 150;

    container.innerHTML = `
      <div class="bar-chart-container">
        <div class="bar-chart-bars">
          ${weeklyData.map(day => {
            const barHeight = Math.max(4, (day.amount / maxSpend) * 100);
            const isOverLimit = day.amount > dailyAverageLimit;
            const barColor = isOverLimit ? 'var(--color-danger)' : (day.isToday ? 'var(--color-primary)' : 'var(--color-accent)');
            return `
              <div class="bar-column ${day.isToday ? 'today' : ''}" title="${day.dayName}: ₹${day.amount.toLocaleString('en-IN')}">
                <div class="bar-tooltip">₹${day.amount.toLocaleString('en-IN')}</div>
                <div class="bar-fill-wrapper" style="height: 100%;">
                  <div class="bar-fill" style="height: ${barHeight}%; background-color: ${barColor};"></div>
                </div>
                <span class="bar-label">${day.shortName}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div class="bar-threshold-line" style="bottom: ${(dailyAverageLimit / maxSpend) * 100}%;">
          <span class="threshold-tag">Safe Limit: ₹${Math.round(dailyAverageLimit)}/day</span>
        </div>
      </div>
    `;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FinanceCharts };
}
