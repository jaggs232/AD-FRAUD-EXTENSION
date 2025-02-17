// Initialize global variables
let mlServiceEndpoint = 'https://api.adfrauddetector.com/analyze';
let fraudDetectionThreshold = 0.7;
let isEnabled = true;

// Initialize when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Ad Fraud Detector installed');
  
  // Initialize storage with default settings
  chrome.storage.local.set({
    isEnabled: true,
    fraudDetectionThreshold: 0.7,
    mlServiceEndpoint: 'https://api.adfrauddetector.com/analyze',
    detectedFrauds: [],
    statistics: {
      scannedAds: 0,
      detectedFrauds: 0,
      lastScan: null
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRIGGER_SCAN') {
    // Handle manual scan trigger
    chrome.tabs.sendMessage(sender.tab.id, { type: 'START_SCAN' });
    return true;
  }
  
  // Load current settings before processing message
  chrome.storage.local.get(['isEnabled', 'fraudDetectionThreshold', 'mlServiceEndpoint'], async (data) => {
    isEnabled = data.isEnabled;
    fraudDetectionThreshold = data.fraudDetectionThreshold;
    mlServiceEndpoint = data.mlServiceEndpoint;
    
    if (message.type === 'AD_DETECTED' && isEnabled) {
      try {
        const result = await analyzeAd(message.adData);
        updateStatistics(result);
        
        if (result.fraudScore > fraudDetectionThreshold) {
          notifyUser(sender.tab.id, result);
          logFraudulentAd(result);
        }
        
        sendResponse({ status: 'analyzed', result });
      } catch (error) {
        console.error('Error analyzing ad:', error);
        sendResponse({ status: 'error', error: error.message });
      }
      return true;
    }
  });
  return true;
});

// Analyze ad data
async function analyzeAd(adData) {
  try {
    // Simulate API call (replace with actual API call when available)
    const fraudScore = Math.random();
    const result = {
      fraudScore,
      confidence: 0.8 + (Math.random() * 0.2),
      fraudType: fraudScore > 0.7 ? 'Suspicious Activity' : 'Normal',
      timestamp: new Date().toISOString()
    };
    
    return result;
  } catch (error) {
    console.error('Error in ad analysis:', error);
    return {
      fraudScore: 0.1,
      confidence: 0.5,
      fraudType: 'unknown',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Update statistics
function updateStatistics(result) {
  chrome.storage.local.get('statistics', (data) => {
    const stats = data.statistics || {
      scannedAds: 0,
      detectedFrauds: 0,
      lastScan: null
    };
    
    stats.scannedAds++;
    if (result.fraudScore > fraudDetectionThreshold) {
      stats.detectedFrauds++;
    }
    stats.lastScan = new Date().toISOString();
    
    chrome.storage.local.set({ statistics: stats });
  });
}

// Notify user about detected fraud
function notifyUser(tabId, result) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    function: showNotification,
    args: [result]
  });
}

// Show notification on page
function showNotification(result) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    max-width: 300px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Ad Fraud Detected</div>
    <div>Type: ${result.fraudType}</div>
    <div>Confidence: ${Math.round(result.confidence * 100)}%</div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Log fraudulent ad
function logFraudulentAd(result) {
  chrome.storage.local.get('detectedFrauds', (data) => {
    const frauds = data.detectedFrauds || [];
    frauds.push({
      ...result,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 entries
    if (frauds.length > 100) {
      frauds.shift();
    }
    
    chrome.storage.local.set({ detectedFrauds: frauds });
  });
}