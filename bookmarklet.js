// Textify - Bookmarklet Script
// This script injects the popup to extract full article text

(function() {
  'use strict';
  
  // Check if popup already exists
  if (document.getElementById('current-bookmarklet-popup')) {
    console.log('Popup already open');
    return;
  }
  
  // Google Analytics tracking function
  function trackEvent(eventName, parameters = {}) {
    try {
      // Load Google Analytics if not already loaded
      if (typeof gtag === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-WMSPQVX00W';
        document.head.appendChild(script);
        
        window.dataLayer = window.dataLayer || [];
        window.gtag = function(){dataLayer.push(arguments);};
        gtag('js', new Date());
        gtag('config', 'G-WMSPQVX00W');
      }
      
      // Track the event
      gtag('event', eventName, {
        event_category: 'Bookmarklet',
        event_label: window.location.hostname,
        ...parameters
      });
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }
  
  // Track bookmarklet usage
  trackEvent('bookmarklet_opened', {
    page_url: window.location.href,
    page_title: document.title
  });
  
  // Create container (no dimming background)
  const container = document.createElement('div');
  container.id = 'current-bookmarklet-popup';
  container.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 520px;
    height: 100%;
    z-index: 999999;
  `;
  
  // Create iframe to hold the popup
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `
    border: none;
    border-left: 1px solid #e2e8f0;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
    width: 520px;
    height: 100%;
    background: white;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);
  iframe.src = 'https://james-schlodder.github.io/textify/popup.html';
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    left: -50px;
    background: white;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 1000000;
    transition: all 0.2s;
  `;
  closeBtn.addEventListener('mouseover', function() {
    this.style.background = '#f1f5f9';
  });
  closeBtn.addEventListener('mouseout', function() {
    this.style.background = 'white';
  });
  closeBtn.addEventListener('click', function() {
    document.body.removeChild(container);
  });
  
  container.appendChild(iframe);
  container.appendChild(closeBtn);
  document.body.appendChild(container);
  
  // Listen for messages from iframe to get page data
  window.addEventListener('message', function(event) {
    // Verify origin
    if (event.origin !== 'https://james-schlodder.github.io') {
      return;
    }
    
    if (event.data.action === 'extractPage') {
      // Extract page data (now async)
      extractPageData().then(pageData => {
        // Send back to iframe
        iframe.contentWindow.postMessage({
          action: 'pageData',
          data: pageData
        }, 'https://james-schlodder.github.io');
      });
    }
  });

  // Function to extract article text from the page
  async function extractPageData() {
    let articleText = '';
    let confidence = 0;
    let method = '';
    
    try {
      // Method 1: Try to find article content using common selectors
      const articleSelectors = [
        'article',
        '[role="main"]',
        'main',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.content',
        '.story-body',
        '.article-body'
      ];
      
      for (const selector of articleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = extractTextFromElement(element);
          if (text && text.length > articleText.length) {
            articleText = text;
            confidence = calculateConfidence(text, element);
            method = `Selector: ${selector}`;
          }
        }
      }
      
      // Method 2: If no good content found, try paragraphs
      if (!articleText || articleText.length < 200) {
        const paragraphs = Array.from(document.querySelectorAll('p'))
          .map(p => p.textContent.trim())
          .filter(text => text.length > 50);
        
        if (paragraphs.length > 0) {
          articleText = paragraphs.join(' ');
          confidence = Math.min(paragraphs.length * 10, 80);
          method = 'Paragraph extraction';
        }
      }
      
      // Method 3: Last resort - try to get any meaningful text
      if (!articleText || articleText.length < 100) {
        const bodyText = document.body.textContent || document.body.innerText || '';
        if (bodyText.length > 200) {
          articleText = bodyText;
          confidence = 30;
          method = 'Full body text';
        }
      }
      
    } catch (error) {
      console.error('Error extracting article text:', error);
      articleText = 'Error extracting text from this page.';
      confidence = 0;
      method = 'Error';
    }
    
    return {
      articleText: cleanTextForSheets(articleText),
      confidence: Math.min(confidence, 100),
      method: method
    };
  }
  
  // Extract clean text from an element
  function extractTextFromElement(element) {
    if (!element) return '';
    
    // Clone to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'aside', 'footer', 'header',
      '.ad', '.advertisement', '.social-share', '.newsletter',
      '[class*="ad"]', '[id*="ad"]'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    return (clone.textContent || clone.innerText || '').trim();
  }
  
  // Calculate confidence score for extracted content
  function calculateConfidence(text, element) {
    if (!text || text.length < 50) return 0;
    
    let score = 0;
    
    // Length bonus
    if (text.length > 200) score += 20;
    if (text.length > 500) score += 30;
    if (text.length > 1000) score += 30;
    
    // Element type bonus
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'article') score += 40;
    if (tagName === 'main') score += 30;
    if (element.getAttribute('role') === 'main') score += 30;
    
    // Class name bonus
    const className = element.className.toLowerCase();
    if (className.includes('content')) score += 20;
    if (className.includes('article')) score += 20;
    if (className.includes('post')) score += 15;
    if (className.includes('story')) score += 15;
    
    return Math.min(score, 100);
  }
  
  // Clean text for Google Sheets compatibility
  function cleanTextForSheets(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes
      .replace(/[\u2018\u2019]/g, "'")  // Replace smart apostrophes
      .replace(/[\u2013\u2014]/g, '-')  // Replace em/en dashes
      .replace(/[\u2026]/g, '...')      // Replace ellipsis
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // Remove control chars
      .trim();
  }
})();
