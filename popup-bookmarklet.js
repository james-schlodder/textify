// Popup script for Textify bookmarklet

document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  const copyBtn = document.getElementById('copyBtn');
  const status = document.getElementById('status');
  const output = document.getElementById('output');
  
  const articleTextInput = document.getElementById('articleText');
  
  // Analytics tracking function
  function trackEvent(eventName, parameters = {}) {
    try {
      if (window.parent && window.parent.gtag) {
        window.parent.gtag('event', eventName, {
          event_category: 'Bookmarklet',
          ...parameters
        });
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
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
      has_content: !!textContent
    });
    
    // Create a temporary textarea to copy from (works in iframes)
    const textarea = document.createElement('textarea');
    textarea.value = textContent;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showStatus('✓ Copied to clipboard!', 'success');
      } else {
        showStatus('✗ Failed to copy', 'error');
      }
    } catch (err) {
      showStatus('✗ Failed to copy', 'error');
      console.error('Copy failed:', err);
    }
    
    document.body.removeChild(textarea);
  });
  
  function generateText() {
    const articleText = articleTextInput.value.trim();
    
    if (!articleText) {
      output.classList.remove('show');
      copyBtn.disabled = true;
      return;
    }
    
    // Show the cleaned text in the output area for preview
    output.textContent = articleText;
    output.classList.add('show');
    copyBtn.disabled = false;
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  function displayConfidence(confidence, method) {
    const container = document.getElementById('confidenceContainer');
    const levelDiv = document.getElementById('confidenceLevel');
    const messageDiv = document.getElementById('confidenceMessage');
    
    container.style.display = 'block';
    
    // Update progress bar
    levelDiv.style.width = confidence + '%';
    levelDiv.textContent = Math.round(confidence) + '%';
    
    // Color coding and messaging based on new thresholds
    if (confidence >= 90) {
      levelDiv.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      messageDiv.innerHTML = '✅ <span style="color: #065f46; font-weight: 600;">High confidence - extraction looks accurate</span>';
      messageDiv.style.color = '#065f46';
    } else if (confidence >= 50) {
      levelDiv.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      messageDiv.innerHTML = '⚠️ <span style="color: #92400e; font-weight: 600;">Medium confidence - review recommended</span>';
      messageDiv.style.color = '#92400e';
    } else {
      levelDiv.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
      messageDiv.innerHTML = '❌ <span style="color: #991b1b; font-weight: 600;">Low confidence - please double-check the results</span>';
      messageDiv.style.color = '#991b1b';
    }
    
    // Add method info as a tooltip or small text
    const methodText = document.createElement('div');
    methodText.style.fontSize = '11px';
    methodText.style.color = '#64748b';
    methodText.style.marginTop = '4px';
    methodText.textContent = 'Method: ' + method;
    
    // Clear and append
    messageDiv.appendChild(methodText);
  }
  
  function showStatus(message, type) {
    status.textContent = message;
    status.className = 'status ' + type;
    
    setTimeout(function() {
      status.className = 'status';
    }, 3000);
  }
});
