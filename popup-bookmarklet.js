// Popup script for Textify bookmarklet

document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  const copyBtn = document.getElementById('copyBtn');
  const status = document.getElementById('status');
  const output = document.getElementById('output');
  
  const articleTextInput = document.getElementById('articleText');
  
  // Analytics tracking function with better error handling
  function trackEvent(eventName, parameters = {}) {
    try {
      // Only try to access gtag if we're not in an iframe or if it's safe
      if (typeof gtag !== 'undefined') {
        gtag('event', eventName, {
          event_category: 'Bookmarklet',
          ...parameters
        });
      }
    } catch (error) {
      // Silently fail - analytics shouldn't break functionality
      console.debug('Analytics not available:', error.message);
    }
  }

  // Request data from parent window when extract button is clicked
  extractBtn.addEventListener('click', function() {
    // Track extraction attempt
    trackEvent('data_extraction_started');
    
    // Ask parent window to extract page data
    window.parent.postMessage({
      action: 'extractPage'
    }, '*');
    
    showStatus('Extracting...', 'success');
  });
  
  // Listen for data from parent window
  window.addEventListener('message', function(event) {
    if (event.data.action === 'pageData') {
      const data = event.data.data;
      
      // Fill in the article text field
      articleTextInput.value = data.articleText || '';
      
      // Display confidence level
      displayConfidence(data.confidence || 0, data.method || 'Unknown method');
      
      // Display word count
      if (data.wordCount !== undefined) {
        displayWordCount(data.wordCount);
      }
      
      showStatus('✓ Extraction complete!', 'success');
      
      // Generate text output
      generateText();
      
      // Enable copy button
      copyBtn.disabled = false;
    }
  });
  
  // Generate text when field changes
  articleTextInput.addEventListener('input', generateText);
  
  // Copy button functionality
  copyBtn.addEventListener('click', function() {
    const textContent = articleTextInput.value.trim();
    
    // Track copy action
    trackEvent('text_copied', {
      text_length: textContent.length,
      has_content: textContent.length > 0
    });
    
    if (!textContent) {
      showStatus('Nothing to copy!', 'error');
      return;
    }
    
    navigator.clipboard.writeText(textContent).then(function() {
      showStatus('✓ Copied to clipboard!', 'success');
      
      // Reset button text after 2 seconds
      setTimeout(function() {
        showStatus('Ready', 'success');
      }, 2000);
    }).catch(function(err) {
      showStatus('Failed to copy', 'error');
      console.error('Copy failed:', err);
    });
  });
  
  function generateText() {
    const text = articleTextInput.value.trim();
    
    if (text) {
      output.textContent = text;
      output.style.display = 'block';
    } else {
      output.style.display = 'none';
    }
  }
  
  function displayConfidence(score, method) {
    const container = document.getElementById('confidenceContainer');
    const bar = document.getElementById('confidenceLevel');
    const message = document.getElementById('confidenceMessage');
    
    container.style.display = 'block';
    
    // Set bar width and color
    bar.style.width = score + '%';
    
    // Color coding
    let color, emoji, text;
    if (score >= 85) {
      color = '#10b981'; // green
      emoji = '✓';
      text = 'High confidence';
    } else if (score >= 70) {
      color = '#f59e0b'; // yellow
      emoji = '⚠';
      text = 'Medium confidence';
    } else {
      color = '#ef4444'; // red
      emoji = '⚠';
      text = 'Low confidence';
    }
    
    bar.style.background = `linear-gradient(90deg, ${color}, ${color}dd)`;
    bar.textContent = score + '%';
    
    message.innerHTML = `
      <span style="font-size: 16px;">${emoji}</span>
      <span style="color: #64748b; font-weight: 500;">${text}</span>
      <span style="color: #94a3b8; font-size: 12px;">• ${method}</span>
    `;
  }
  
  function displayWordCount(count) {
    const wordCountDisplay = document.getElementById('wordCountDisplay');
    const wordCountSpan = document.getElementById('wordCount');
    
    // Check if elements exist before trying to use them
    if (!wordCountDisplay || !wordCountSpan) {
      console.warn('Word count display elements not found in HTML');
      return;
    }
    
    wordCountDisplay.style.display = 'block';
    
    // Format number with commas
    wordCountSpan.textContent = count.toLocaleString();
  }
  
  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    status.style.display = 'block';
  }
  
  // Initialize
  showStatus('Ready', 'success');
});
