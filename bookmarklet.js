// Textify - Bookmarklet Script
// This script injects the popup to extract full article text

(function() {
  'use strict';
  
  // Check if popup already exists
  if (document.getElementById('current-bookmarklet-popup')) {
    console.log('Popup already open');
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
  
  // Try highly specific article selectors with data attributes and JSON-LD
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
    
    // More specific and reliable selectors for major news sites
    const specificSelectors = [
      // NYTimes specific - target the actual story content
      'section[name="articleBody"] p',
      '[data-module="ArticleBody"] p', 
      '.StoryBodyCompanionColumn p',
      
      // WordPress and common CMS
      'article .entry-content p',
      'article .post-content p', 
      '.article-content p',
      '.post-body p',
      
      // Other major news sites
      '[data-qa="article-body"] p',
      '[data-testid="article-body"] p',
      '.story-body p',
      '.article-body p'
    ];
    
    for (const selector of specificSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 2) { // Need multiple paragraphs
        const paragraphs = Array.from(elements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 20 && !isMetadataText(text));
        
        if (paragraphs.length > 2) {
          const text = paragraphs.join(' ');
          if (text.length > 500) {
            return { text: text, score: 4 };
          }
        }
      }
    }
    
    return { text: '', score: 0 };
  }
  
  // Try semantic HTML5 article selectors
  function trySemanticSelectors() {
    const semanticSelectors = [
      // Prioritize content within article tags - look for paragraphs
      { selector: 'article p', score: 3 },
      { selector: 'main article p', score: 3 },
      { selector: '[role="main"] p', score: 2 },
      { selector: 'main p', score: 2 },
      
      // Content-specific containers with paragraphs
      { selector: '.content p, .post p, .entry p', score: 2 },
      { selector: '.article-content p, .story-body p', score: 2 }
    ];
    
    for (const item of semanticSelectors) {
      const elements = document.querySelectorAll(item.selector);
      if (elements.length > 2) { // Need multiple paragraphs
        const paragraphs = Array.from(elements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 20 && !isMetadataText(text));
        
        if (paragraphs.length > 2) {
          const text = paragraphs.join(' ');
          if (text.length > 200) {
            return { text: text, score: item.score };
          }
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
        // Look for paragraphs within the container
        const paragraphs = container.querySelectorAll('p');
        if (paragraphs.length > 2) {
          const paragraphTexts = Array.from(paragraphs)
            .map(p => p.textContent.trim())
            .filter(text => text.length > 20 && !isMetadataText(text));
          
          if (paragraphTexts.length > 2) {
            const text = paragraphTexts.join(' ');
            const score = scoreContent(text, container);
            
            if (score > bestScore && text.length > 200) {
              bestScore = score;
              bestText = text;
            }
          }
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
      
      // Look for paragraphs within the element
      const paragraphs = element.querySelectorAll('p');
      if (paragraphs.length < 2) continue;
      
      const paragraphTexts = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(text => text.length > 20 && !isMetadataText(text));
      
      if (paragraphTexts.length < 2) continue;
      
      const text = paragraphTexts.join(' ');
      if (text.length < 100) continue;
      
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
  
  // Simple check for obvious metadata/navigation text
  function isMetadataText(text) {
    if (text.length < 10) return true;
    
    const metadataPatterns = [
      /^(By|Published|Updated|Share|Subscribe|Sign up|Learn more)/i,
      /^(Credit|Photo|Image):/i,
      /^\d+\s*(comments?|shares?)$/i,
      /^(Read more|Continue reading|Related|Tags?):/i,
      /^(Advertisement|Supported by)/i,
      /^(Leer en español|Read in)/i
    ];
    
    return metadataPatterns.some(pattern => pattern.test(text));
  }

  // Function to clean text for Google Sheets (simple formatting only)
  function cleanTextForSheets(text) {
    if (!text) return '';
    
    return text
      // Replace multiple whitespace characters with single space
      .replace(/\s+/g, ' ')
      // Replace smart quotes and dashes with regular versions
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/[\u2026]/g, '...')
      // Remove control characters but keep basic punctuation
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim();
  }
  
  // Score content quality based on multiple signals - fixed to be more reliable
  function scoreContent(text, element) {
    if (!text || text.length < 50) return 0;
    
    let score = 0;
    
    // Length scoring - be more strict about what constitutes good content
    if (text.length > 200) score += 5;
    if (text.length > 500) score += 10;
    if (text.length > 1000) score += 20;
    if (text.length > 2000) score += 30;
    if (text.length > 5000) score += 10; // Diminishing returns for very long text
    
    // Count actual paragraphs/sentences for quality assessment
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const sentenceBonus = Math.min(sentences.length, 20) * 2; // Cap at reasonable level
    score += sentenceBonus;
    
    // Element semantic scoring
    const tagName = element.tagName.toLowerCase();
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    
    // Strong semantic indicators
    if (tagName === 'article') score += 30;
    if (tagName === 'main') score += 20;
    if (element.getAttribute('role') === 'main') score += 20;
    
    // Content class indicators  
    const positiveClasses = ['article', 'content', 'post', 'story', 'body', 'text', 'entry'];
    const negativeClasses = ['ad', 'sidebar', 'footer', 'header', 'nav', 'menu', 'comment', 'social', 'share', 'related'];
    
    for (const cls of positiveClasses) {
      if (className.includes(cls) || id.includes(cls)) score += 10;
    }
    
    for (const cls of negativeClasses) {
      if (className.includes(cls) || id.includes(cls)) score -= 30; // Heavy penalty for non-content
    }
    
    // Content quality indicators
    const words = text.split(/\s+/).length;
    if (words > 100) score += 10;
    if (words > 300) score += 15;
    
    // Journalistic patterns
    if (text.includes('said') || text.includes('according to')) score += 10;
    if (/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text)) score += 5; // Proper nouns
    
    // Penalize if text looks like metadata
    if (isMetadataText(text.substring(0, 100))) score -= 50;
    
    return Math.max(0, score); // Ensure non-negative
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
})();
