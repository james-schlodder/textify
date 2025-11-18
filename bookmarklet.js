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

  // Function to extract full article text with high accuracy
  async function extractPageData() {
    let articleText = '';
    let confidence = 0;
    let method = '';
    
    // Step 1: Try highly specific article selectors with data attributes and JSON-LD
    const result1 = trySpecificSelectors();
    if (result1.text && result1.text.length > 200) {
      return { 
        articleText: cleanTextForSheets(result1.text),
        confidence: Math.min(95 + result1.score, 100),
        method: 'JSON-LD or specific selectors'
      };
    }
    
    // Step 2: Try semantic article selectors
    const result2 = trySemanticSelectors();
    if (result2.text && result2.text.length > 200) {
      return { 
        articleText: cleanTextForSheets(result2.text),
        confidence: Math.min(85 + result2.score, 95),
        method: 'Semantic HTML selectors'
      };
    }
    
    // Step 3: Try container-based extraction with content scoring
    const result3 = tryContainerBasedExtraction();
    if (result3.text && result3.text.length > 200) {
      return { 
        articleText: cleanTextForSheets(result3.text),
        confidence: Math.min(75 + result3.score, 90),
        method: 'Container analysis'
      };
    }
    
    // Step 4: Advanced content analysis and scoring
    const result4 = tryAdvancedContentScoring();
    if (result4.text && result4.text.length > 100) {
      return { 
        articleText: cleanTextForSheets(result4.text),
        confidence: Math.min(60 + result4.score, 80),
        method: 'Content scoring analysis'
      };
    }
    
    // Step 5: Last resort - intelligent paragraph filtering
    const result5 = tryIntelligentParagraphFiltering();
    
    const finalText = result5.text || 'No article text found on this page.';
    const finalConfidence = result5.text ? Math.min(40 + result5.score, 60) : 0;
    
    return {
      articleText: cleanTextForSheets(finalText),
      confidence: finalConfidence,
      method: 'Paragraph filtering fallback'
    };
  }
  
  // Try JSON-LD structured data and specific article selectors
  function trySpecificSelectors() {
    // Check for JSON-LD structured data first
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.articleBody || (data['@type'] === 'Article' && data.text)) {
          return { text: data.articleBody || data.text, score: 5 }; // Highest confidence
        }
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.articleBody || (item['@type'] === 'Article' && item.text)) {
              return { text: item.articleBody || item.text, score: 5 };
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Highly specific selectors for major news sites and CMS platforms
    const specificSelectors = [
      // WordPress and common CMS
      '.post-content .entry-content, .entry-content .post-content',
      'article .entry-content, .entry-content article',
      '.post-body .article-body, .article-body .post-body',
      
      // News sites with specific data attributes
      '[data-module="ArticleBody"], [data-component="ArticleBody"]',
      '[data-qa="article-body"], [data-testid="article-body"]',
      '[data-article-body], [data-story-body]',
      
      // Medium, Substack, Ghost
      'article[data-post-id] .post-content',
      '.post-content .markup, .markup .post-content',
      'section[data-field="body"], [data-field="body"] section',
      '.post-full-content, .entry-content .post-full-content',
      
      // News sites specific patterns
      '.story-body .story-content, .story-content .story-body',
      '.article-wrap .article-content, .article-content .article-wrap',
      '.content-body .article-text, .article-text .content-body'
    ];
    
    for (const selector of specificSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = extractTextFromElement(element);
        if (text && text.length > 200) {
          return { text: text, score: 3 };
        }
      }
    }
    
    return { text: '', score: 0 };
  }
  
  // Try semantic HTML5 article selectors
  function trySemanticSelectors() {
    const semanticSelectors = [
      // Prioritize content within article tags
      { selector: 'article[itemtype*="Article"] [itemprop="articleBody"]', score: 4 },
      { selector: 'article[itemtype*="NewsArticle"] [itemprop="articleBody"]', score: 4 },
      { selector: 'article [role="main"]', score: 3 },
      { selector: 'article .article-content', score: 3 },
      { selector: 'article .post-content', score: 3 },
      { selector: 'article .entry-content', score: 3 },
      { selector: 'article .content-body', score: 2 },
      { selector: 'article .story-body', score: 2 },
      { selector: 'article .article-body', score: 2 },
      
      // Main content areas
      { selector: 'main article', score: 2 },
      { selector: '[role="main"] article', score: 2 },
      { selector: 'main .article-content', score: 1 },
      { selector: '[role="main"] .article-content', score: 1 }
    ];
    
    for (const item of semanticSelectors) {
      const element = document.querySelector(item.selector);
      if (element) {
        const text = extractTextFromElement(element);
        if (text && text.length > 200) {
          return { text: text, score: item.score };
        }
      }
    }
    
    return { text: '', score: 0 };
  }
  
  // Try container-based extraction with content scoring
  function tryContainerBasedExtraction() {
    const containerSelectors = [
      'article', 'main', '[role="main"]', '.main', '#main',
      '.content', '#content', '.post', '.entry', '.story'
    ];
    
    let bestText = '';
    let bestScore = 0;
    
    for (const selector of containerSelectors) {
      const containers = document.querySelectorAll(selector);
      for (const container of containers) {
        const text = extractTextFromElement(container);
        const score = scoreContent(text, container);
        
        if (score > bestScore && text.length > 200) {
          bestScore = score;
          bestText = text;
        }
      }
    }
    
    // Normalize score to 0-10 range
    const normalizedScore = Math.min(Math.floor(bestScore / 20), 10);
    
    return { text: bestText, score: normalizedScore };
  }
  
  // Advanced content analysis using multiple signals
  function tryAdvancedContentScoring() {
    const allElements = document.querySelectorAll('div, section, article, main');
    let bestText = '';
    let bestScore = 0;
    
    for (const element of allElements) {
      // Skip obviously non-content elements
      if (isNonContentElement(element)) continue;
      
      const text = extractTextFromElement(element);
      if (!text || text.length < 100) continue;
      
      const score = scoreContent(text, element);
      
      if (score > bestScore) {
        bestScore = score;
        bestText = text;
      }
    }
    
    // Normalize score to 0-10 range
    const normalizedScore = Math.min(Math.floor(bestScore / 15), 10);
    
    return { text: bestText, score: normalizedScore };
  }
  
  // Last resort intelligent paragraph filtering
  function tryIntelligentParagraphFiltering() {
    const allParagraphs = document.querySelectorAll('p');
    const contentParagraphs = [];
    
    for (const p of allParagraphs) {
      if (isContentParagraph(p)) {
        contentParagraphs.push(p.textContent.trim());
      }
    }
    
    // Find the longest sequence of paragraphs (likely the main article)
    if (contentParagraphs.length > 0) {
      const text = contentParagraphs.join(' ');
      const score = contentParagraphs.length > 5 ? 8 : Math.min(contentParagraphs.length, 5);
      return { text: text, score: score };
    }
    
    return { text: '', score: 0 };
  }
  
  // Extract clean text from an element
  function extractTextFromElement(element) {
    if (!element) return '';
    
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'aside', 'footer', 'header',
      '.ad', '.advertisement', '.promo', '.newsletter', '.subscription',
      '.social', '.share', '.comment', '.related', '.sidebar',
      '.author', '.byline', '.date', '.time', '.tag', '.category',
      '.breadcrumb', '.navigation', '.menu', '.caption', '.credit',
      '[aria-label*="advertisement"]', '[class*="ad-"]', '[id*="ad-"]'
    ];
    
    for (const selector of unwantedSelectors) {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    }
    
    // Get text content and clean it
    const text = clone.textContent || clone.innerText || '';
    return text.trim();
  }
  
  // Score content quality based on multiple signals
  function scoreContent(text, element) {
    if (!text || text.length < 50) return 0;
    
    let score = 0;
    
    // Length scoring (sweet spot around 1000-5000 characters)
    if (text.length > 500) score += 10;
    if (text.length > 1000) score += 20;
    if (text.length > 2000) score += 30;
    if (text.length > 5000) score += 10; // Diminishing returns for very long text
    
    // Paragraph count (good articles have multiple paragraphs)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    score += Math.min(sentences.length * 2, 50);
    
    // Element positioning and semantic signals
    const tagName = element.tagName.toLowerCase();
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    
    // Boost for semantic elements
    if (tagName === 'article') score += 30;
    if (tagName === 'main') score += 20;
    if (element.getAttribute('role') === 'main') score += 20;
    
    // Boost for content-indicating class names
    const positiveClasses = [
      'article', 'content', 'post', 'story', 'body', 'text', 'entry'
    ];
    const negativeClasses = [
      'ad', 'sidebar', 'footer', 'header', 'nav', 'menu', 'comment',
      'social', 'share', 'related', 'author', 'date', 'tag'
    ];
    
    for (const cls of positiveClasses) {
      if (className.includes(cls) || id.includes(cls)) score += 15;
    }
    
    for (const cls of negativeClasses) {
      if (className.includes(cls) || id.includes(cls)) score -= 20;
    }
    
    // Text quality indicators
    const words = text.split(/\s+/).length;
    if (words > 50) score += 10;
    if (words > 200) score += 20;
    
    // Check for common article patterns
    if (/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text)) score += 5; // Proper nouns
    if (/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)) score += 5; // Dates
    if (text.includes('said') || text.includes('according to')) score += 10; // News patterns
    
    return score;
  }
  
  // Check if element is clearly non-content
  function isNonContentElement(element) {
    const tagName = element.tagName.toLowerCase();
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    
    // Skip certain tags
    if (['script', 'style', 'nav', 'aside', 'footer', 'header'].includes(tagName)) {
      return true;
    }
    
    // Skip elements with non-content indicators
    const nonContentPatterns = [
      'ad', 'advertisement', 'promo', 'banner', 'popup', 'modal',
      'newsletter', 'subscription', 'signup', 'social', 'share',
      'comment', 'reply', 'discussion', 'sidebar', 'widget',
      'navigation', 'nav', 'menu', 'breadcrumb', 'footer', 'header'
    ];
    
    for (const pattern of nonContentPatterns) {
      if (className.includes(pattern) || id.includes(pattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  // Check if paragraph is likely article content
  function isContentParagraph(p) {
    const text = p.textContent.trim();
    
    // Must have substantial text
    if (text.length < 30) return false;
    
    // Skip if parent element suggests non-content
    let parent = p.parentElement;
    while (parent && parent !== document.body) {
      if (isNonContentElement(parent)) return false;
      parent = parent.parentElement;
    }
    
    // Skip if contains mostly links or other non-content indicators
    const linkText = Array.from(p.querySelectorAll('a')).reduce((acc, a) => acc + a.textContent.length, 0);
    if (linkText > text.length * 0.8) return false; // More than 80% links
    
    return true;
  }
  
  // Function to clean text for Google Sheets (single line, no extra spaces/characters)
  function cleanTextForSheets(text) {
    return text
      // Replace multiple whitespace characters (spaces, tabs, newlines) with single space
      .replace(/\s+/g, ' ')
      // Remove special characters that might cause issues in spreadsheets
      .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes with regular quotes
      .replace(/[\u2018\u2019]/g, "'") // Replace smart apostrophes with regular apostrophes
      .replace(/[\u2013\u2014]/g, '-') // Replace em/en dashes with regular dashes
      .replace(/[\u2026]/g, '...') // Replace ellipsis character with three dots
      // Remove any remaining control characters except basic punctuation
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Trim whitespace from beginning and end
      .trim();
  }
})();
