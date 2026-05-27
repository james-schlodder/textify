// Textify \u0x2014 Yahoo Finance CSP workaround (extract + open popup in new tab)
//
// finance.yahoo.com sends a Content-Security-Policy header that blocks both
//   - script-src external origins  (so <script src="https://...bookmarklet.js"> fails)
//   - connect-src external origins (so fetch(...) also fails)
//
// A javascript: URL run from a user's bookmark bypasses CSP for the code it
// executes directly. So we inline a minimal extraction routine into the
// bookmarklet URL, then open the existing popup.html in a NEW TAB and
// postMessage the extracted data to it. popup.html already has a handler
// for {action:'pageData', data:{...}} (see popup-bookmarklet.js), so no
// modification to popup.html / popup-bookmarklet.js / bookmarklet.js is needed.
//
// This file is the READABLE SOURCE. It is NOT loaded at runtime \u0x2014 it gets
// minified and pasted into the bookmarklet URL in index.html. Update both
// when you change anything here.
//
// Scope: this code runs only when the bookmarklet URL detects
// location.hostname includes 'finance.yahoo.com'. All other hosts continue
// to use the existing external bookmarklet.js loader.

(function () {
  'use strict';

  // ---------- Text helpers ----------
  function cleanText(t) {
    if (!t) return '';
    return t.replace(/\s+/g, ' ')
      .replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u2013\u2014]/g, '-').replace(/[\u2026]/g, '...')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/Advertisement\s*SKIP\s*ADVERTISEMENT/gi, '')
      .replace(/SKIP\s*ADVERTISEMENT/gi, '')
      .replace(/Share full article/gi, '')
      .trim();
  }
  function countWords(t) {
    if (!t) return 0;
    return t.trim().split(/\s+/).filter(function (w) { return w.length > 0; }).length;
  }

  // ---------- Content filters ----------
  function isMetadata(text) {
    if (text.length < 10) return true;
    var patterns = [
      /^(By|Published|Updated|Posted|Written by|Author|Share|Subscribe|Sign up|Learn more|Read more)/i,
      /^(Credit|Photo|Image|Video|Caption|Listen to):/i,
      /^\d+\s*(comments?|shares?|views?|likes?)$/i,
      /^(Continue reading|Related|Tags?|Topics?|Categories|See more on|View more):/i,
      /^View more$/i,
      /^(Advertisement|Supported by|Skip|Ad|Promoted)/i,
      /^(Leer en|Read in|Disponible en)/i,
      /^(Share full article|Related Content|More on)/i,
      /^Copyright \xA9?\s*\d{4}/i,
      /^Follow @/i,
      /^Follow .+ on (Twitter|X|Instagram|Facebook)/i,
      /^\d+\s*min(ute)?s?\s*read$/i,
      /^(We use cookies|This site uses cookies|By continuing)/i,
      /^(Accept|Reject|Manage) (all )?cookies/i,
      /^\d{1,2}:\d{2}\s*(AM|PM|a\.m\.|p\.m\.)?$/i,
      /^\d+[KMB]?\s*(shares?|retweets?|reposts?)$/i
    ];
    for (var i = 0; i < patterns.length; i++) if (patterns[i].test(text)) return true;
    return false;
  }

  function isNonContentElement(element) {
    var tagName = element.tagName.toLowerCase();
    var className = (element.className || '').toString().toLowerCase();
    var id = (element.id || '').toLowerCase();
    if (['script', 'style', 'nav', 'aside', 'footer', 'header', 'form'].indexOf(tagName) !== -1) return true;
    var classTokens = className.split(/\s+/).filter(Boolean);
    var patterns = ['ad', 'advertisement', 'promo', 'banner', 'popup', 'modal', 'newsletter', 'subscription', 'signup', 'social', 'share', 'comment', 'reply', 'discussion', 'sidebar', 'widget', 'navigation', 'nav', 'menu', 'breadcrumb', 'related', 'sponsored', 'partner-content', 'paywall', 'callout', 'cta', 'inline-ad', 'author-bio', 'byline', 'tag-list', 'trending', 'most-popular', 'recirculation', 'tooltip', 'cookie', 'consent', 'footer'];
    for (var p = 0; p < patterns.length; p++) {
      var pat = patterns[p];
      if (id.indexOf(pat) !== -1) return true;
      for (var t = 0; t < classTokens.length; t++) {
        var tok = classTokens[t];
        if (tok === pat || tok.indexOf(pat + '-') === 0 || tok.indexOf(pat + '_') === 0 || tok.lastIndexOf('-' + pat) === tok.length - pat.length - 1 || tok.lastIndexOf('_' + pat) === tok.length - pat.length - 1) return true;
      }
    }
    return false;
  }

  function isInNonContentContainer(element) {
    var parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (isNonContentElement(parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function extractTextFromElement(element) {
    if (!element) return '';
    var clone = element.cloneNode(true);
    var unwantedSelectors = [
      'script', 'style', 'iframe', 'nav', 'aside', 'footer', 'header', 'form', 'button', 'svg', 'figure figcaption',
      '.advertisement', '.ad', '[class^="ad-"]', '[class*=" ad-"]', '[class*="inline-ad"]',
      '.social-share', '.share-buttons', '[class*="share"]',
      '.newsletter', '[class*="newsletter"]',
      '.related', '[class*="related"]',
      '.comments', '[class*="comment"]',
      '[class*="sidebar"]', '[class*="promo"]', '[class*="sponsored"]', '[class*="recommended"]', '[class*="more-from"]',
      '.paywall', '[class*="paywall"]',
      '[class*="subscribe"]', '[class*="callout"]', '[class*="cta"]',
      '[class*="article-footer"]', '[class*="byline"]', '[class*="author-bio"]',
      '[class*="tag-list"]', '[class*="topics"]',
      '[role="complementary"]', '[role="navigation"]'
    ];
    unwantedSelectors.forEach(function (s) {
      try { clone.querySelectorAll(s).forEach(function (e) { e.remove(); }); } catch (e) {}
    });
    var paragraphs = clone.querySelectorAll('p');
    var texts = [];
    var shortStreak = 0;
    for (var i = 0; i < paragraphs.length; i++) {
      var text = paragraphs[i].textContent.trim();
      if (text.length < 20 || isMetadata(text)) continue;
      if (/^Write to .+ at .+@/i.test(text)) break;
      if (text.length < 80) {
        shortStreak++;
        if (shortStreak >= 5) break;
      } else {
        shortStreak = 0;
      }
      texts.push(text);
    }
    return texts.join('\n\n');
  }

  // ---------- Extraction methods ----------
  function tryJSONLD() {
    try {
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        try {
          var data = JSON.parse(scripts[i].textContent);
          var items = Array.isArray(data) ? data : [data];
          for (var j = 0; j < items.length; j++) {
            var item = items[j];
            if (item && (item['@type'] === 'NewsArticle' || item['@type'] === 'Article') && item.articleBody) {
              return { text: item.articleBody };
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
    return { text: '' };
  }

  function tryMicrodata() {
    var el = document.querySelector('[itemprop="articleBody"]');
    return { text: el ? extractTextFromElement(el) : '' };
  }

  function tryYahoo() {
    var selectors = [
      '[data-testid="article-body"]',
      '.body-wrap',
      '.caas-body',
      '.caas-content-wrapper .caas-body',
      '.article-wrap .caas-body',
      '[data-test-locator="articleBody"]',
      '.caas-content',
      '.atoms-wrapper'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        var text = extractTextFromElement(el);
        if (text.length > 200) return { text: text };
      }
    }
    var candidates = document.querySelectorAll('article p, .caas-body p, [role="main"] p, .body p, main p');
    var texts = [];
    for (var k = 0; k < candidates.length; k++) {
      var p = candidates[k];
      var t = p.textContent.trim();
      if (t.length < 30) continue;
      if (isMetadata(t)) continue;
      if (isInNonContentContainer(p)) continue;
      if (/^(View comments|Sign in to view|Download the app)/i.test(t)) continue;
      if (/^(Read full article|Story continues)/i.test(t)) break;
      texts.push(t);
    }
    return { text: texts.length ? texts.join('\n\n') : '' };
  }

  function trySemanticFallback() {
    var sels = ['article', 'main', '[role="main"]'];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (el) {
        var text = extractTextFromElement(el);
        if (text.length > 200) return { text: text };
      }
    }
    return { text: '' };
  }

  function extract() {
    var r = tryJSONLD();
    if (r.text && r.text.length > 200) {
      var t1 = cleanText(r.text);
      return { articleText: t1, confidence: 95, method: 'JSON-LD structured data', wordCount: countWords(t1) };
    }
    r = tryMicrodata();
    if (r.text && r.text.length > 200) {
      var t2 = cleanText(r.text);
      return { articleText: t2, confidence: 93, method: 'Microdata', wordCount: countWords(t2) };
    }
    r = tryYahoo();
    if (r.text && r.text.length > 200) {
      var t3 = cleanText(r.text);
      return { articleText: t3, confidence: 90, method: 'Yahoo selectors', wordCount: countWords(t3) };
    }
    r = trySemanticFallback();
    if (r.text && r.text.length > 200) {
      var t4 = cleanText(r.text);
      return { articleText: t4, confidence: 70, method: 'Semantic HTML', wordCount: countWords(t4) };
    }
    return { articleText: 'Could not extract article text from this page.', confidence: 0, method: 'Failed', wordCount: 0 };
  }

  // ---------- Run: extract, open popup in new tab, postMessage data ----------
  var data = extract();

  var popupUrl = 'https://james-schlodder.github.io/textify/popup.html';
  var newWin = window.open(popupUrl, '_blank');

  if (!newWin) {
    alert('Textify needs pop-ups enabled. Please allow pop-ups for finance.yahoo.com and click Textify again.');
    return;
  }

  // Retry posting the data because we can't know cross-origin when the
  // popup's message listener is ready. popup-bookmarklet.js registers it on
  // DOMContentLoaded and is idempotent against repeated pageData messages
  // (innerHTML is reset each call before appending the method line).
  var targetOrigin = 'https://james-schlodder.github.io';
  var attempts = 0;
  // ~5 seconds at 200ms
  var maxAttempts = 25;
  var iv = setInterval(function () {
    try {
      newWin.postMessage({ action: 'pageData', data: data }, targetOrigin);
    } catch (e) {}
    attempts++;
    if (attempts >= maxAttempts) clearInterval(iv);
  }, 200);
})();
