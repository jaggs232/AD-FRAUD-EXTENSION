document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const enableToggle = document.getElementById('enableToggle');
  const scannedAdsElement = document.getElementById('scannedAds');
  const detectedFraudsElement = document.getElementById('detectedFrauds');
  const lastScanElement = document.getElementById('lastScan');
  const scanPageBtn = document.getElementById('scanPageBtn');
  const viewReportBtn = document.getElementById('viewReportBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  
  // Initialize popup state
  initializeState();
  
  // Initialize auto-refresh
  startAutoRefresh();
  
  // Event Listeners
  enableToggle.addEventListener('change', handleToggleChange);
  scanPageBtn.addEventListener('click', handleScanPage);
  viewReportBtn.addEventListener('click', handleViewReport);
  optionsBtn.addEventListener('click', handleOptions);
  
  // Functions
  function initializeState() {
    chrome.storage.local.get(['isEnabled', 'statistics'], (data) => {
      // Set toggle state
      enableToggle.checked = data.isEnabled !== false;
      
      // Update statistics display
      updateStatisticsDisplay(data.statistics);
    });
  }
  
  function updateStatisticsDisplay(statistics) {
    if (!statistics) {
      statistics = {
        scannedAds: 0,
        detectedFrauds: 0,
        lastScan: null
      };
    }
    
    // Update counters with animation
    animateCounter(scannedAdsElement, statistics.scannedAds);
    animateCounter(detectedFraudsElement, statistics.detectedFrauds);
    
    // Update last scan time with relative time
    if (statistics.lastScan) {
      updateLastScanTime(statistics.lastScan);
    } else {
      lastScanElement.textContent = 'Last scan: Never';
    }
  }
  
  function updateLastScanTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    let timeText;
    if (diff < 60000) { // Less than 1 minute
      timeText = 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      timeText = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diff < 86400000) { // Less than 1 day
      const hours = Math.floor(diff / 3600000);
      timeText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      timeText = date.toLocaleString();
    }
    
    lastScanElement.textContent = `Last scan: ${timeText}`;
  }
  
  function animateCounter(element, target) {
    const current = parseInt(element.textContent);
    const increment = Math.ceil((target - current) / 20);
    let value = current;
    
    const animate = () => {
      if (value < target) {
        value = Math.min(value + increment, target);
        element.textContent = value.toLocaleString();
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  function handleToggleChange() {
    const isEnabled = this.checked;
    chrome.storage.local.set({ isEnabled });
    
    // Show status indicator
    showStatusIndicator(isEnabled ? 'Protection enabled' : 'Protection disabled');
  }
  
  async function handleScanPage() {
    try {
      // Disable button during scan
      scanPageBtn.disabled = true;
      scanPageBtn.textContent = 'Scanning...';
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Trigger scan
      await chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_SCAN' });
      
      // Update statistics after scan
      setTimeout(() => {
        refreshStatistics();
        scanPageBtn.disabled = false;
        scanPageBtn.textContent = 'Scan Current Page';
      }, 1000);
      
    } catch (error) {
      console.error('Scan failed:', error);
      scanPageBtn.disabled = false;
      scanPageBtn.textContent = 'Scan Current Page';
      showStatusIndicator('Scan failed. Please try again.', 'error');
    }
  }
  
  function handleViewReport() {
    chrome.tabs.create({ url: chrome.runtime.getURL('report.html') });
  }
  
  function handleOptions() {
    chrome.runtime.openOptionsPage();
  }
  
  function showStatusIndicator(message, type = 'success') {
    const indicator = document.createElement('div');
    indicator.className = `status-indicator ${type}`;
    indicator.textContent = message;
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }
  
  function startAutoRefresh() {
    // Refresh statistics every 5 seconds
    const refreshInterval = setInterval(refreshStatistics, 5000);
    
    // Clean up interval when popup closes
    window.addEventListener('unload', () => {
      clearInterval(refreshInterval);
    });
  }
  
  function refreshStatistics() {
    chrome.storage.local.get('statistics', (data) => {
      updateStatisticsDisplay(data.statistics);
    });
  }
});