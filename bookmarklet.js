// Textify - Bookmarklet Script
// This script injects the popup to extract full article text

(function() {
  'use strict';
  
  // Check if popup already exists
  if (document.getElementById('current-bookmarklet-popup')) {
    return;
  }
  
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
      // Extract page data
      extractPageData().then(pageData => {
        // Send back to iframe
        iframe.contentWindow.postMessage({
          action: 'pageData',
          data: pageData
        }, 'https://james-schlodder.github.io');
      }).catch(error => {
        console.error('Error extracting page data:', error);
      });
    }
  });

  // Main extraction function with multiple fallback methods
  async function extractPageData() {
    let articleText = '';
    let confidence = 0;
    let method = '';
    
    // Method 1: Try JSON-LD structured data (highest accuracy)
    const result1 = tryJSONLD();
    if (result1.text && result1.text.length > 200) {
      return {
        articleText: cleanText(result1.text),
        confidence: 95,
        method: 'JSON-LD structured data'
      };
    }
    
    // Method 2: Try site-specific selectors
    const result2 = trySiteSpecificSelectors();
    if (result2.text && result2.text.length > 200) {
      return {
        articleText: cleanText(result2.text),
        confidence: 90,
        method: 'Site-specific selectors'
      };
    }
    
    // Method 3: Try semantic HTML selectors
    const result3 = trySemanticSelectors();
    if (result3.text && result3.text.length > 200) {
      return {
        articleText: cleanText(result3.text),
        confidence: 85,
        method: 'Semantic HTML'
      };
    }
    
    // Method 4: Container-based content scoring
    const result4 = tryContainerScoring();
    if (result4.text && result4.text.length > 200) {
      return {
        articleText: cleanText(result4.text),
        confidence: 75,
        method: 'Container analysis'
      };
    }
    
    // Method 5: Smart paragraph extraction
    const result5 = trySmartParagraphs();
    if (result5.text && result5.text.length > 100) {
      return {
        articleText: cleanText(result5.text),
        confidence: 60,
        method: 'Paragraph extraction'
      };
    }
    
    // Fallback
    return {
      articleText: 'Could not extract article text from this page.',
      confidence: 0,
      method: 'Failed'
    };
  }
  
  // Method 1: Check for JSON-LD structured data
  function tryJSONLD() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent);
          const items = Array.isArray(data) ? data : [data];
          
          for (const item of items) {
            if (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') {
              if (item.articleBody) {
                return { text: item.articleBody };
              }
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      console.error('JSON-LD extraction error:', e);
    }
    return { text: '' };
  }
  
  // Method 2: Site-specific selectors for major news sites
  function trySiteSpecificSelectors() {
    // WSJ-specific extraction with "Write to" boundary detection
    if (window.location.hostname.includes('wsj.com')) {
      const wsjResult = tryWSJExtraction();
      if (wsjResult.text && wsjResult.text.length > 200) {
        return wsjResult;
      }
    }
    
    const siteSelectors = [
      // New York Times
      'section[name="articleBody"]',
      '.StoryBodyCompanionColumn',
      
      // Washington Post
      '.article-body',
      
      // CNN
      '.article__content',
      
      // Reuters
      '.article-body__content',
      
      // Guardian
      '.article-body-commercial-selector',
      
      // BBC
      '.article__body-content',
      
      // Bloomberg
      '.body-content',
      
      // Wall Street Journal (fallback)
      '.article-content',
      
      // Generic WordPress/CMS
      'article .entry-content',
      'article .post-content',
      '.article-content',
      '.post-body'
    ];
    
    for (const selector of siteSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = extractTextFromElement(element);
        if (text.length > 200) {
          return { text: text };
        }
      }
    }
    
    return { text: '' };
  }
  
  // WSJ-specific extraction function
  function tryWSJExtraction() {
    const articleParagraphs = document.querySelectorAll('p[data-type="paragraph"]');
    const texts = [];
    
    for (const p of articleParagraphs) {
      const text = p.textContent.trim();
      
      // Stop at "Write to" paragraph (author contact info)
      if (text.startsWith('Write to ')) {
        break;
      }
      
      // Skip very short paragraphs
      if (text.length < 30) {
        continue;
      }
      
      // Skip metadata
      if (isMetadata(text)) {
        continue;
      }
      
      texts.push(text);
    }
    
    if (texts.length > 0) {
      return { text: texts.join('\n\n') };
    }
    
    return { text: '' };
  }
  
  // Method 3: Semantic HTML5 selectors
  function trySemanticSelectors() {
    const selectors = [
      'article',
      'main article',
      '[role="main"]',
      'main',
      '#main-content',
      '.main-content'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = extractTextFromElement(element);
        if (text.length > 200) {
          return { text: text };
        }
      }
    }
    
    return { text: '' };
  }
  
  // Method 4: Container-based scoring - find element with most article-like content
  function tryContainerScoring() {
    const containers = document.querySelectorAll('div, section, article, main');
    let bestElement = null;
    let bestScore = 0;
    
    for (const container of containers) {
      // Skip obviously non-content containers
      if (isNonContentElement(container)) continue;
      
      const paragraphs = container.querySelectorAll('p');
      if (paragraphs.length < 3) continue;
      
      const text = extractTextFromElement(container);
      if (text.length < 200) continue;
      
      const score = scoreElement(container, text);
      
      if (score > bestScore) {
        bestScore = score;
        bestElement = container;
      }
    }
    
    if (bestElement) {
      return { text: extractTextFromElement(bestElement) };
    }
    
    return { text: '' };
  }
  
  // Method 5: Smart paragraph extraction
  function trySmartParagraphs() {
    const allParagraphs = document.querySelectorAll('p');
    const contentParagraphs = [];
    
    for (const p of allParagraphs) {
      const text = p.textContent.trim();
      
      // Must be substantial
      if (text.length < 40) continue;
      
      // Skip if in non-content container
      if (isInNonContentContainer(p)) continue;
      
      // Skip if mostly links
      const linkText = Array.from(p.querySelectorAll('a'))
        .reduce((acc, a) => acc + a.textContent.length, 0);
      if (linkText > text.length * 0.7) continue;
      
      // Skip obvious metadata
      if (isMetadata(text)) continue;
      
      contentParagraphs.push(text);
    }
    
    if (contentParagraphs.length > 0) {
      return { text: contentParagraphs.join('\n\n') };
    }
    
    return { text: '' };
  }
  
  // Extract clean text from an element
  function extractTextFromElement(element) {
    if (!element) return '';
    
    const clone = element.cloneNode(true);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'iframe', 'nav', 'aside', 'footer', 'header',
      'form', 'button',
      '.advertisement', '.ad', '[class*="ad-"]', '[id*="ad-"]',
      '.social-share', '.share-buttons', '[class*="share"]',
      '.newsletter', '[class*="newsletter"]',
      '.related', '[class*="related"]',
      '.comments', '[class*="comment"]',
      '[class*="sidebar"]', '[id*="sidebar"]',
      '[class*="promo"]', '[class*="sponsored"]',
      '[class*="recommended"]', '[class*="more-from"]'
    ];
    
    unwantedSelectors.forEach(selector => {
      try {
        const elements = clone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      } catch (e) {
        // Invalid selector, skip
      }
    });
    
    // Get paragraphs
    const paragraphs = clone.querySelectorAll('p');
    const texts = [];
    let consecutiveShortParagraphs = 0;
    
    for (const p of paragraphs) {
      const text = p.textContent.trim();
      
      // Filter out metadata and very short text
      if (text.length < 20 || isMetadata(text)) {
        continue;
      }
      
      // Check for end-of-article indicators (including "Write to")
      if (isEndOfArticle(text)) {
        break;
      }
      
      // Stop if we hit multiple short paragraphs (likely headlines/promos)
      // But allow quoted dialogue and short narrative paragraphs
      if (text.length < 80) {
        consecutiveShortParagraphs++;
        if (consecutiveShortParagraphs >= 5) {
          break;
        }
      } else {
        consecutiveShortParagraphs = 0;
      }
      
      texts.push(text);
    }
    
    return texts.join('\n\n');
  }
  
  // Check if text indicates end of article content
  function isEndOfArticle(text) {
    const endPatterns = [
      // WSJ-specific end markers
      /^Write to .+ at .+@/i,       // Author contact info - PRIMARY WSJ INDICATOR
      /Buy Side is independent/i,
      /Best .+ of \d{4}/i,           // "Best Christmas Trees of 2024"
      /\d+ of the Best/i,            // "6 of the Best Financial..."
      
      // Generic promotional content
      /^(More|Related|Recommended|Popular|Trending):/i,
      /Click here to/i,
      /Subscribe (now|today) for/i,
      
      // Newsletter/subscription prompts
      /Sign up for our newsletter/i,
      /Get our .+ newsletter/i
    ];
    
    return endPatterns.some(pattern => pattern.test(text));
  }
  
  // Check if text is metadata/navigation
  function isMetadata(text) {
    if (text.length < 10) return true;
    
    const metadataPatterns = [
      // Common metadata prefixes
      /^(By|Published|Updated|Posted|Written by|Author|Share|Subscribe|Sign up|Learn more|Read more)/i,
      
      // Image/media captions
      /^(Credit|Photo|Image|Video|Caption|Listen to):/i,
      
      // Engagement metrics
      /^\d+\s*(comments?|shares?|views?|likes?)$/i,
      
      // Navigation
      /^(Continue reading|Related|Tags?|Topics?|Categories|See more on|View more):/i,
      /^View more$/i,
      
      // Advertisements
      /^(Advertisement|Supported by|Skip|Ad|Promoted)/i,
      
      // Language options
      /^(Leer en|Read in|Disponible en)/i,
      
      // Author bios (NYTimes style)
      /is (a|an) .+ (correspondent|reporter|writer|editor|journalist)/i,
      
      // Footer content
      /^(Share full article|Related Content|More on)/i,
      
      // WSJ-specific patterns
      /artificial.intelligence tool created this summary/i,
      /^Write to .+ at .+@/i,  // Author contact info
      /^Copyright ©\d{4}/i,     // Copyright notices
      /^\d{32}$/                // WSJ tracking codes (32-digit hex strings)
    ];
    
    return metadataPatterns.some(pattern => pattern.test(text));
  }
  
  // Check if element is in a non-content container
  function isInNonContentContainer(element) {
    let parent = element.parentElement;
    
    while (parent && parent !== document.body) {
      if (isNonContentElement(parent)) return true;
      parent = parent.parentElement;
    }
    
    return false;
  }
  
  // Check if element is clearly non-content
  function isNonContentElement(element) {
    const tagName = element.tagName.toLowerCase();
    const className = (element.className || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    
    // Skip certain tags
    if (['script', 'style', 'nav', 'aside', 'footer', 'header', 'form'].includes(tagName)) {
      return true;
    }
    
    // Skip elements with non-content patterns
    const nonContentPatterns = [
      'ad', 'advertisement', 'promo', 'banner', 'popup', 'modal',
      'newsletter', 'subscription', 'signup', 'social', 'share',
      'comment', 'reply', 'discussion', 'sidebar', 'widget',
      'navigation', 'nav', 'menu', 'breadcrumb', 'related',
      'sponsored', 'partner-content'
    ];
    
    for (const pattern of nonContentPatterns) {
      if (className.includes(pattern) || id.includes(pattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  // Score an element for article-likeness
  function scoreElement(element, text) {
    let score = 0;
    
    // Length scoring
    if (text.length > 500) score += 20;
    if (text.length > 1000) score += 30;
    if (text.length > 2000) score += 30;
    
    // Paragraph count
    const paragraphs = element.querySelectorAll('p');
    score += Math.min(paragraphs.length * 5, 50);
    
    // Semantic elements
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'article') score += 50;
    if (tagName === 'main') score += 40;
    if (element.getAttribute('role') === 'main') score += 40;
    
    // Class/ID indicators
    const className = (element.className || '').toLowerCase();
    const id = (element.id || '').toLowerCase();
    
    const positiveIndicators = ['article', 'content', 'post', 'story', 'body', 'text', 'entry'];
    const negativeIndicators = ['ad', 'sidebar', 'footer', 'header', 'nav', 'menu', 'comment', 'social', 'related'];
    
    for (const indicator of positiveIndicators) {
      if (className.includes(indicator) || id.includes(indicator)) {
        score += 15;
      }
    }
    
    for (const indicator of negativeIndicators) {
      if (className.includes(indicator) || id.includes(indicator)) {
        score -= 40;
      }
    }
    
    // Content quality indicators
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    score += Math.min(sentences.length * 2, 40);
    
    // Journalistic patterns
    if (/said|according to|reported|announced/i.test(text)) score += 10;
    
    return Math.max(0, score);
  }
  
  // Clean text for output
  function cleanText(text) {
    if (!text) return '';
    
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      
      // Remove smart quotes and special punctuation
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2026]/g, '...')
      
      // Remove control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      
      // Clean up common artifacts
      .replace(/Advertisement\s*SKIP\s*ADVERTISEMENT/gi, '')
      .replace(/SKIP\s*ADVERTISEMENT/gi, '')
      .replace(/Share full article/gi, '')
      .replace(/Related Content/gi, '')
      
      .trim();
  }
})();
