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
      
      // Display word count
      displayWordCount(data.wordCount || 0);
      
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
      levelDiv.style.background = 'linear-gradient(135
