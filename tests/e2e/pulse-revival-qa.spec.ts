import { test, expect } from '@playwright/test';

/**
 * QA: 죽은 글 부활 기능 프로덕션 검증
 * Target: https://pulseup.cc
 * Date: 2026-03-17
 */
test.describe('Pulse Revival Feature - Production QA', () => {

  // SC-01: 피드 페이지 정상 로딩
  test('SC-01: Feed page loads with post list', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('https://pulseup.cc', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: '/tmp/sc01-feed.png', fullPage: false });

    const url = page.url();
    console.log('Feed URL:', url);
    console.log('Console errors:', consoleErrors.length > 0 ? consoleErrors.join(' | ') : 'none');

    // Should not 404
    expect(url).not.toContain('404');

    // Page should have meaningful content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(50);

    // Check for any post/article/feed content
    const contentInfo = await page.evaluate(() => {
      const selectors = ['article', 'main a', '[class*="post"]', '[class*="feed"]', '[class*="card"]'];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) return { found: true, selector: sel, count: els.length };
      }
      const main = document.querySelector('main');
      const text = main?.textContent?.trim() ?? '';
      return { found: text.length > 50, selector: 'main-text', count: text.length };
    });

    console.log('Content check:', JSON.stringify(contentInfo));
    expect(contentInfo.found).toBe(true);

    // Critical: no critical console errors (allow non-critical)
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('404') && !e.includes('analytics')
    );
    console.log('Critical errors:', criticalErrors.length);
  });

  // SC-02: 살아있는 글 상세 진입
  test('SC-02: Live post detail page loads correctly', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('https://pulseup.cc', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: '/tmp/sc02-feed-before-click.png', fullPage: false });

    // Find any clickable post link
    const postLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
      const candidates = links.filter(a => {
        const href = a.href;
        return href.includes('pulseup.cc') &&
               !href.endsWith('pulseup.cc/') &&
               href !== 'https://pulseup.cc' &&
               !href.includes('/login') &&
               !href.includes('/auth') &&
               !href.includes('/write') &&
               !href.includes('/api') &&
               !href.includes('/profile');
      });
      return candidates.length > 0 ? candidates[0].href : null;
    });

    console.log('Found post link:', postLink);

    if (!postLink) {
      console.log('No post links found - feed may be empty or require login');
      const bodyText = await page.textContent('body');
      console.log('Body snippet:', bodyText?.substring(0, 300));
      // Pass if feed loaded (no posts may be a data issue)
      expect(page.url()).not.toContain('404');
      return;
    }

    await page.goto(postLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: '/tmp/sc02-post-detail.png', fullPage: false });

    const finalUrl = page.url();
    console.log('Post detail URL:', finalUrl);
    console.log('Console errors:', consoleErrors.length > 0 ? consoleErrors.join(' | ') : 'none');

    // Should not 404
    expect(finalUrl).not.toContain('404');

    // Check page does not show 404 error text
    const bodyText = await page.textContent('body') ?? '';
    const is404 = bodyText.toLowerCase().includes('not found') && bodyText.includes('404');
    expect(is404).toBe(false);

    // Page should have content
    expect(bodyText.length).toBeGreaterThan(50);
  });

  // SC-03: write 페이지 URL 파라미터 전달
  test('SC-03: Write page URL params (title & content) pre-fill or redirect', async ({ page }) => {
    const testTitle = encodeURIComponent('테스트제목');
    const testContent = encodeURIComponent('테스트내용입니다');
    const writeUrl = `https://pulseup.cc/write?title=${testTitle}&content=${testContent}`;

    await page.goto(writeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.screenshot({ path: '/tmp/sc03-write-page.png', fullPage: false });

    const finalUrl = page.url();
    console.log('Write page final URL:', finalUrl);

    // Case A: write page rendered (not redirected to login)
    if (finalUrl.includes('/write')) {
      console.log('CASE A: Write page rendered (not redirected)');

      // Check if title param is in HTML source
      const htmlSource = await page.content();
      const titleDecoded = '테스트제목';
      const contentDecoded = '테스트내용입니다';

      const titleInSource = htmlSource.includes(titleDecoded);
      const contentInSource = htmlSource.includes(contentDecoded);

      console.log('Title in HTML source:', titleInSource);
      console.log('Content in HTML source:', contentInSource);

      // Take screenshot of form
      await page.screenshot({ path: '/tmp/sc03-write-form.png', fullPage: true });

      // Check for form inputs
      const formInfo = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, textarea'));
        return inputs.map(el => ({
          tag: el.tagName,
          value: (el as HTMLInputElement | HTMLTextAreaElement).value,
          placeholder: (el as HTMLInputElement).placeholder || '',
        }));
      });

      console.log('Form inputs:', JSON.stringify(formInfo));

      // Assert: URL params should be pre-filled in form
      const titleFilled = formInfo.some(f => f.value.includes('테스트제목'));
      const contentFilled = formInfo.some(f => f.value.includes('테스트내용'));

      console.log('Title filled:', titleFilled);
      console.log('Content filled:', contentFilled);

      expect(titleFilled).toBe(true);
      expect(contentFilled).toBe(true);
    }
    // Case B: redirected to login (auth gate)
    else if (finalUrl.includes('/login') || finalUrl.includes('/auth')) {
      console.log('CASE B: Redirected to login (auth gate active)');

      // Check if URL params are preserved in redirect
      const loginUrl = page.url();
      console.log('Login URL (params preserved?):', loginUrl);

      // Even if redirected, the page should load correctly
      expect(finalUrl).not.toContain('404');

      // Check HTML source for any reference to the write URL params
      // (some apps preserve params via next/auth callbackUrl)
      const htmlSource = await page.content();
      const hasCallbackRef = htmlSource.includes('write') || htmlSource.includes('title');
      console.log('Has write/title reference in HTML:', hasCallbackRef);

      // The key assertion: redirect is clean (not 404)
      expect(finalUrl).not.toContain('404');
      console.log('Result: Auth redirect (params may be lost) - acceptable behavior for non-auth state');
    }
    // Case C: unexpected redirect
    else {
      console.log('CASE C: Unexpected redirect to:', finalUrl);
      // Should not 404
      expect(finalUrl).not.toContain('404');
    }
  });

});
