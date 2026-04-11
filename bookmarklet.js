// Textify - Bookmarklet Script
// This script injects the popup to extract full article text

(function() {
  'use strict';
  
  // Check if popup already exists
  if (document.getElementById('current-bookmarklet-popup')) {
    return;
  }

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
    @keyframes textifySpin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Detect CSP-restricted sites that block iframes (e.g. Yahoo Finance)
  const useInlineMode = window.location.hostname.includes('yahoo.com');

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

  if (useInlineMode) {
    // === INLINE MODE: Build popup UI directly in the DOM (bypasses CSP iframe restrictions) ===
    const panel = document.createElement('div');
    panel.style.cssText = `
      border: none;
      border-left: 1px solid #e2e8f0;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
      width: 520px;
      height: 100%;
      background: #f8fafc;
      animation: slideIn 0.3s ease-out;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
    `;

    panel.innerHTML = `
      <div style="background: linear-gradient(135deg, #4a9fb5 0%, #2d7a8f 100%); padding: 32px 28px 28px 28px; color: white; position: relative; overflow: hidden;">
        <div style="position: absolute; top: -50%; right: -10%; width: 200px; height: 200px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
        <h2 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; position: relative; z-index: 1;">Textify</h2>
        <div style="margin-top: 6px; font-size: 13px; opacity: 0.9; font-weight: 300; position: relative; z-index: 1;">Extract full text from articles instantly</div>
      </div>
      <div style="background: white; padding: 28px;">
        <div style="margin-bottom: 20px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Article Text</label>
          <textarea id="textify-inline-textarea" style="width: 100%; min-height: 300px; padding: 14px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 14px; font-family: inherit; color: #1e293b; background: white; resize: vertical; line-height: 1.5; box-sizing: border-box; outline: none; transition: border-color 0.2s;" placeholder="Full article text will appear here..."></textarea>
        </div>
        <div id="textify-inline-confidence" style="display: none; margin-bottom: 20px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Confidence Level</label>
          <div style="background: #f1f5f9; border-radius: 8px; height: 24px; position: relative; border: 2px solid #e2e8f0;">
            <div id="textify-inline-confidence-bar" style="height: 100%; border-radius: 6px; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; color: white;"></div>
          </div>
          <div id="textify-inline-confidence-msg" style="margin-top: 8px; font-size: 13px;"></div>
        </div>
        <div id="textify-inline-wordcount" style="display: none; margin-bottom: 20px;">
          <label style="display: block; font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Word Count</label>
          <div style="padding: 12px 16px; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 8px; border: 2px solid #cbd5e1;">
            <span id="textify-inline-wc" style="font-size: 24px; font-weight: 700; color: #1e293b;">0</span>
            <span style="font-size: 13px; color: #64748b; font-weight: 500; margin-left: 6px;">words</span>
          </div>
        </div>
        <div id="textify-inline-loading" style="text-align: center; padding: 16px; color: #4a9fb5; font-weight: 500; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;">
          <div style="width: 18px; height: 18px; border: 2px solid #e2e8f0; border-top-color: #4a9fb5; border-radius: 50%; animation: textifySpin 0.8s linear infinite;"></div>
          Extracting article text...
        </div>
        <button id="textify-inline-copy" disabled style="width: 100%; padding: 13px 20px; border: 2px solid #4a9fb5; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit; background: white; color: #4a9fb5; transition: all 0.3s; margin-top: 10px;">📋 Copy Full Text</button>
        <div id="textify-inline-status" style="margin-top: 16px; border-radius: 8px; font-size: 13px; font-weight: 500; text-align: center; display: none; padding: 12px 16px;"></div>
      </div>
      <div style="text-align: center; padding: 16px 28px 20px 28px; font-size: 11px; color: #94a3b8;">Powered by Watershed Analytics</div>
    `;

    container.appendChild(panel);
    container.appendChild(closeBtn);
    document.body.appendChild(container);

    // Inline mode: extract immediately and populate the panel
    const inlineTextarea = panel.querySelector('#textify-inline-textarea');
    const inlineCopyBtn = panel.querySelector('#textify-inline-copy');
    const inlineLoading = panel.querySelector('#textify-inline-loading');
    const inlineStatus = panel.querySelector('#textify-inline-status');
    const inlineConfidence = panel.querySelector('#textify-inline-confidence');
    const inlineConfBar = panel.querySelector('#textify-inline-confidence-bar');
    const inlineConfMsg = panel.querySelector('#textify-inline-confidence-msg');
    const inlineWordCount = panel.querySelector('#textify-inline-wordcount');
    const inlineWC = panel.querySelector('#textify-inline-wc');

    function formatForSpreadsheet(text) {
      if (!text) return '';
      return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')
        .replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u2013\u2014]/g, '-').replace(/[\u2026]/g, '...')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    }

    function showInlineStatus(msg, type) {
      inlineStatus.textContent = msg;
      inlineStatus.style.display = 'block';
      if (type === 'success') {
        inlineStatus.style.background = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
        inlineStatus.style.color = '#065f46';
        inlineStatus.style.border = '1px solid #6ee7b7';
      } else {
        inlineStatus.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
        inlineStatus.style.color = '#991b1b';
        inlineStatus.style.border = '1px solid #fca5a5';
      }
      setTimeout(function() { inlineStatus.style.display = 'none'; }, 3000);
    }

    // Enable copy when user types/pastes manually
    inlineTextarea.addEventListener('input', function() {
      inlineCopyBtn.disabled = !inlineTextarea.value.trim();
    });

    // Copy button
    inlineCopyBtn.addEventListener('click', function() {
      const text = formatForSpreadsheet(inlineTextarea.value);
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      try {
        if (document.execCommand('copy')) {
          showInlineStatus('✓ Copied to clipboard!', 'success');
        } else {
          showInlineStatus('✗ Failed to copy', 'error');
        }
      } catch (e) {
        showInlineStatus('✗ Failed to copy', 'error');
      }
      document.body.removeChild(ta);
    });

    // Hover effect on copy button
    inlineCopyBtn.addEventListener('mouseover', function() {
      if (!this.disabled) {
        this.style.background = '#4a9fb5';
        this.style.color = 'white';
      }
    });
    inlineCopyBtn.addEventListener('mouseout', function() {
      this.style.background = 'white';
      this.style.color = '#4a9fb5';
    });

    // Auto-extract
    extractPageData().then(function(data) {
      inlineLoading.style.display = 'none';
      inlineTextarea.value = data.articleText || '';

      // Confidence
      if (data.confidence > 0) {
        inlineConfidence.style.display = 'block';
        inlineConfBar.style.width = data.confidence + '%';
        inlineConfBar.textContent = Math.round(data.confidence) + '%';
        if (data.confidence >= 90) {
          inlineConfBar.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
          inlineConfMsg.innerHTML = '<span style="color:#065f46;font-weight:600;">✅ High confidence</span>';
        } else if (data.confidence >= 50) {
          inlineConfBar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
          inlineConfMsg.innerHTML = '<span style="color:#92400e;font-weight:600;">⚠️ Medium confidence - review recommended</span>';
        } else {
          inlineConfBar.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
          inlineConfMsg.innerHTML = '<span style="color:#991b1b;font-weight:600;">❌ Low confidence - please double-check</span>';
        }
        var methodDiv = document.createElement('div');
        methodDiv.style.cssText = 'font-size:11px;color:#64748b;margin-top:4px;';
        methodDiv.textContent = 'Method: ' + (data.method || 'Unknown');
        inlineConfMsg.appendChild(methodDiv);
      }

      // Word count
      if (data.wordCount > 0) {
        inlineWordCount.style.display = 'block';
        inlineWC.textContent = data.wordCount;
      }

      inlineCopyBtn.disabled = !data.articleText;
      showInlineStatus('✓ Extraction complete!', 'success');
    }).catch(function(err) {
      inlineLoading.style.display = 'none';
      showInlineStatus('✗ Extraction failed', 'error');
      console.error('Textify extraction error:', err);
    });

  } else {
    // === IFRAME MODE: Standard approach for most sites ===
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
    iframe.src = 'https://james-schlodder.github.io/textify/popup.html';

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
  }

  // Main extraction function with multiple fallback methods
  async function extractPageData() {
    let articleText = '';
    let confidence = 0;
    let method = '';
    
    // Method 1: Try JSON-LD structured data (highest accuracy)
    const result1 = tryJSONLD();
    if (result1.text && result1.text.length > 200) {
      const cleanedText = cleanText(result1.text);
      return {
        articleText: cleanedText,
        confidence: 95,
        method: 'JSON-LD structured data',
        wordCount: countWords(cleanedText)
      };
    }
    
    // Method 1b: Try microdata (itemprop="articleBody")
    const result1b = tryMicrodata();
    if (result1b.text && result1b.text.length > 200) {
      const cleanedText = cleanText(result1b.text);
      return {
        articleText: cleanedText,
        confidence: 93,
        method: 'Microdata (itemprop)',
        wordCount: countWords(cleanedText)
      };
    }

    // Method 2: Try site-specific selectors
    const result2 = trySiteSpecificSelectors();
    if (result2.text && result2.text.length > 200) {
      const cleanedText = cleanText(result2.text);
      return {
        articleText: cleanedText,
        confidence: 90,
        method: 'Site-specific selectors',
        wordCount: countWords(cleanedText)
      };
    }
    
    // Method 3: Try semantic HTML selectors
    const result3 = trySemanticSelectors();
    if (result3.text && result3.text.length > 200) {
      const cleanedText = cleanText(result3.text);
      return {
        articleText: cleanedText,
        confidence: 85,
        method: 'Semantic HTML',
        wordCount: countWords(cleanedText)
      };
    }
    
    // Method 4: Container-based content scoring
    const result4 = tryContainerScoring();
    if (result4.text && result4.text.length > 200) {
      const cleanedText = cleanText(result4.text);
      return {
        articleText: cleanedText,
        confidence: 75,
        method: 'Container analysis',
        wordCount: countWords(cleanedText)
      };
    }
    
    // Method 5: Smart paragraph extraction
    const result5 = trySmartParagraphs();
    if (result5.text && result5.text.length > 100) {
      const cleanedText = cleanText(result5.text);
      return {
        articleText: cleanedText,
        confidence: 60,
        method: 'Paragraph extraction',
        wordCount: countWords(cleanedText)
      };
    }
    
    // Fallback
    return {
      articleText: 'Could not extract article text from this page.',
      confidence: 0,
      method: 'Failed',
      wordCount: 0
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
  
  // Method 1b: Check for itemprop="articleBody" (microdata)
  function tryMicrodata() {
    const articleBody = document.querySelector('[itemprop="articleBody"]');
    if (articleBody) {
      return { text: extractTextFromElement(articleBody) };
    }
    return { text: '' };
  }

  // Method 2: Site-specific selectors for major news sites
  function trySiteSpecificSelectors() {
    // Yahoo Finance-specific extraction
    if (window.location.hostname.includes('yahoo.com')) {
      const yahooResult = tryYahooExtraction();
      if (yahooResult.text && yahooResult.text.length > 200) {
        return yahooResult;
      }
    }

    // Quartz (qz.com) - uses Tailwind + "payload-richtext" wrappers per paragraph
    if (window.location.hostname.includes('qz.com')) {
      const quartzResult = tryQuartzExtraction();
      if (quartzResult.text && quartzResult.text.length > 200) {
        return quartzResult;
      }
    }

    // Reuters-specific extraction (uses <div> not <p> for paragraphs)
    if (window.location.hostname.includes('reuters.com')) {
      const reutersResult = tryReutersExtraction();
      if (reutersResult.text && reutersResult.text.length > 200) {
        return reutersResult;
      }
    }

    // WSJ-specific extraction with "Write to" boundary detection
    if (window.location.hostname.includes('wsj.com')) {
      const wsjResult = tryWSJExtraction();
      if (wsjResult.text && wsjResult.text.length > 200) {
        return wsjResult;
      }
    }
    
    // NYT-specific extraction
    if (window.location.hostname.includes('nytimes.com')) {
      const nytResult = tryNYTExtraction();
      if (nytResult.text && nytResult.text.length > 200) {
        return nytResult;
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
      '.dcr-1cas496',

      // BBC
      '.article__body-content',
      '[data-component="text-block"]',

      // Bloomberg
      '.body-content',

      // Wall Street Journal (fallback)
      '.article-content',

      // Substack
      '.body.markup',
      '.available-content',

      // Medium
      'article section',

      // The Atlantic
      '.article-body',
      '[data-article-body]',

      // Axios
      '.DraftEditor-root',

      // AP News
      '.RichTextStoryBody',
      '[data-key="article-body"]',

      // Politico
      '.story-text',
      '.article__text',

      // The Verge / Vox Media
      '.duet--article--article-body-component',
      '.c-entry-content',

      // NPR
      '.storytext',

      // The Hill
      '.field-items',

      // Business Insider / Insider
      '.content-lock-content',
      '.piano-article-body',

      // Forbes
      '.article-body-container',

      // Data attribute patterns (many modern sites)
      '[data-testid="article-body"]',
      '[data-article-body]',
      '[data-content-type="article"]',

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
  
  // NYT-specific extraction function
  function tryNYTExtraction() {
    // NYT uses section[name="articleBody"] for article content
    const articleBody = document.querySelector('section[name="articleBody"]');
    if (!articleBody) {
      return { text: '' };
    }
    
    const paragraphs = articleBody.querySelectorAll('p');
    const texts = [];
    
    for (const p of paragraphs) {
      const text = p.textContent.trim();
      
      // Skip very short empty paragraphs
      if (text.length < 5) {
        continue;
      }
      
      // Stop at obvious end markers
      if (text.match(/^(A version of this article appears|Advertisement|SKIP ADVERTISEMENT)/i)) {
        break;
      }
      
      texts.push(text);
    }
    
    if (texts.length > 0) {
      return { text: texts.join('\n\n') };
    }
    
    return { text: '' };
  }
  
  // Reuters-specific extraction function
  function tryReutersExtraction() {
    // Reuters uses <div data-testid="paragraph-N"> for article paragraphs, NOT <p> tags
    // The article body is inside [data-testid="ArticleBody"]
    const articleBody = document.querySelector('[data-testid="ArticleBody"]');
    const container = articleBody || document.querySelector('[data-testid="Article"]');
    if (!container) return { text: '' };

    // Select all paragraph divs by data-testid pattern
    const paragraphDivs = container.querySelectorAll('[data-testid^="paragraph-"]');
    const texts = [];

    for (const div of paragraphDivs) {
      const text = div.textContent.trim();

      // Skip short/empty
      if (text.length < 20) continue;

      // Skip metadata
      if (isMetadata(text)) continue;

      texts.push(text);
    }

    // If no paragraph-N divs found, try getting text from the ArticleBody directly
    // but exclude promo-box and SignOff elements
    if (texts.length === 0 && container) {
      const allChildren = container.children;
      for (const child of allChildren) {
        const testId = child.getAttribute('data-testid') || '';
        // Skip non-content elements
        if (testId === 'promo-box' || testId === 'SignOff' || testId === 'Tags') continue;
        if (testId.startsWith('paragraph-') || testId === '') {
          const text = child.textContent.trim();
          if (text.length >= 20 && !isMetadata(text)) {
            texts.push(text);
          }
        }
      }
    }

    if (texts.length > 0) {
      return { text: texts.join('\n\n') };
    }

    return { text: '' };
  }

  // Quartz (qz.com) extraction function
  function tryQuartzExtraction() {
    // Quartz wraps each paragraph in its own div.payload-richtext > p
    // These are scattered inside the article element, interspersed with ads and widgets
    const article = document.querySelector('article');
    if (!article) return { text: '' };

    const richTextDivs = article.querySelectorAll('div.payload-richtext p');
    const texts = [];

    for (const p of richTextDivs) {
      const text = p.textContent.trim();

      // Skip short/empty
      if (text.length < 30) continue;

      // Skip image captions (usually photographer/agency credits)
      if (/^\s*(Photo|Image|Credit|Getty|AP Photo|Reuters|Bloomberg|AFP|Shutterstock)/i.test(text)) continue;
      if (/\/ Getty Images$/i.test(text)) continue;
      if (/\/ (AP|Reuters|Bloomberg|AFP|Shutterstock)/i.test(text)) continue;

      // Skip byline
      if (/^By\s/i.test(text)) continue;

      // Skip newsletter/signup prompts
      if (/sign up for/i.test(text)) break;

      // Skip share/social text
      if (/^Share to (X|Facebook|Reddit|Email)/i.test(text)) continue;

      texts.push(text);
    }

    if (texts.length > 0) {
      return { text: texts.join('\n\n') };
    }

    return { text: '' };
  }

  // Yahoo Finance-specific extraction function
  function tryYahooExtraction() {
    // Yahoo Finance uses "caas" (Content as a Service) framework
    // Try multiple known Yahoo article body selectors
    const yahooSelectors = [
      '.caas-body',
      '.caas-content-wrapper .caas-body',
      '.article-wrap .caas-body',
      '[data-test-locator="articleBody"]',
      '[data-testid="article-body"]',
      '.body-wrap',
      '.caas-content',
      '.atoms-wrapper'
    ];

    for (const selector of yahooSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = extractTextFromElement(el);
        if (text.length > 200) {
          return { text: text };
        }
      }
    }

    // Fallback: grab all paragraphs inside the main content area
    // Yahoo articles typically have a single article element or main content wrapper
    const candidates = document.querySelectorAll('article p, .caas-body p, [role="main"] p, .body p');
    const texts = [];

    for (const p of candidates) {
      const text = p.textContent.trim();
      if (text.length < 30) continue;
      if (isMetadata(text)) continue;
      if (isInNonContentContainer(p)) continue;

      // Skip Yahoo-specific non-content
      if (/^(View comments|Sign in to view|Download the app)/i.test(text)) continue;
      if (/^(Read full article|Story continues)/i.test(text)) break;

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
      'form', 'button', 'svg', 'figure figcaption',
      '.advertisement', '.ad', '[class^="ad-"]', '[class*=" ad-"]', '[id^="ad-"]', '[id*=" ad-"]',
      '[class*="inline-ad"]', '[class*="ad_"]',
      '.social-share', '.share-buttons', '[class*="share"]',
      '.newsletter', '[class*="newsletter"]',
      '.related', '[class*="related"]',
      '[data-testid*="related"]',
      '.comments', '[class*="comment"]',
      '[class*="sidebar"]', '[id*="sidebar"]',
      '[class*="promo"]', '[class*="sponsored"]',
      '[class*="recommended"]', '[class*="more-from"]',
      '.paywall', '[class*="paywall"]',
      '.subscription', '[class*="subscribe"]',
      '[class*="callout"]', '[class*="cta"]',
      '.article-footer', '[class*="article-footer"]',
      '[class*="byline"]', '[class*="author-bio"]',
      '[class*="tag-list"]', '[class*="topics"]',
      '[role="complementary"]', '[role="navigation"]',
      '[data-testid="newsletter"]', '[data-testid="share"]'
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
      /Get our .+ newsletter/i,

      // Corrections / updates
      /^Corrections? & Amplifications?/i,
      /^(This (article|story) was (updated|corrected))/i,
      /^(Editor'?s? note|Correction|Update):/i,

      // Reporter social / contact
      /^Follow @/i,
      /^Follow .+ on (Twitter|X|Instagram)/i,

      // Substack / Medium endings
      /^(Thanks for reading|If you enjoyed this|Share this post)/i,

      // Generic "read more" / upsell
      /^(Read more|Continue reading|See also|Don't miss)/i,
      /^(This (article|post) (is|was) (first )?published)/i
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
      /^Write to .+ at .+@/i,
      /^Copyright ©?\s*\d{4}/i,
      /^\d{32}$/,

      // Social follow patterns
      /^Follow @/i,
      /^Follow .+ on (Twitter|X|Instagram|Facebook)/i,

      // Read time indicators
      /^\d+\s*min(ute)?s?\s*read$/i,

      // Cookie / consent
      /^(We use cookies|This site uses cookies|By continuing)/i,
      /^(Accept|Reject|Manage) (all )?cookies/i,

      // Timestamps only
      /^\d{1,2}:\d{2}\s*(AM|PM|a\.m\.|p\.m\.)?$/i,

      // Share counts
      /^\d+[KMB]?\s*(shares?|retweets?|reposts?)$/i
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
    // Match against individual class tokens to avoid false positives on Tailwind
    // utility classes (e.g. "leading-*" containing "ad", "payload-*" containing "ad")
    const classTokens = (className || '').split(/\s+/).filter(Boolean);
    const nonContentPatterns = [
      'ad', 'advertisement', 'promo', 'banner', 'popup', 'modal',
      'newsletter', 'subscription', 'signup', 'social', 'share',
      'comment', 'reply', 'discussion', 'sidebar', 'widget',
      'navigation', 'nav', 'menu', 'breadcrumb', 'related',
      'sponsored', 'partner-content', 'paywall', 'callout',
      'cta', 'inline-ad', 'author-bio', 'byline', 'tag-list',
      'trending', 'most-popular', 'recirculation', 'tooltip',
      'cookie', 'consent', 'footer'
    ];

    for (const pattern of nonContentPatterns) {
      // Check ID with substring (IDs rarely have Tailwind-style collisions)
      if (id.includes(pattern)) {
        return true;
      }
      // Check class tokens: match if any token equals, starts with, or contains the pattern
      // as a whole segment (pattern-, pattern_, or exact match)
      for (const token of classTokens) {
        if (token === pattern || token.startsWith(pattern + '-') || token.startsWith(pattern + '_') || token.endsWith('-' + pattern) || token.endsWith('_' + pattern)) {
          return true;
        }
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

    // Text density: ratio of text length to innerHTML length
    // Article bodies have high text density; nav/chrome has low density
    const htmlLength = element.innerHTML.length;
    if (htmlLength > 0) {
      const density = text.length / htmlLength;
      if (density > 0.4) score += 25;
      else if (density > 0.25) score += 15;
      else if (density < 0.1) score -= 20;
    }

    // Link density penalty: containers with lots of links relative to text are likely nav
    const links = element.querySelectorAll('a');
    const linkTextLength = Array.from(links).reduce((acc, a) => acc + (a.textContent || '').length, 0);
    if (text.length > 0) {
      const linkRatio = linkTextLength / text.length;
      if (linkRatio > 0.5) score -= 50;
      else if (linkRatio > 0.3) score -= 25;
    }

    // Reward containers with article-like child elements
    if (element.querySelector('blockquote')) score += 10;
    if (element.querySelector('figure')) score += 5;

    // Data attribute checks (modern sites)
    if (element.getAttribute('data-article-body') !== null) score += 40;
    if ((element.getAttribute('data-testid') || '').includes('article')) score += 30;
    if ((element.getAttribute('data-content-type') || '').includes('article')) score += 30;
    if (element.getAttribute('itemprop') === 'articleBody') score += 40;

    return Math.max(0, score);
  }
  
  // Count words in text
  function countWords(text) {
    if (!text) return 0;
    
    // Split by whitespace and filter out empty strings
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
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