import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildAndroidGmailIntentUrl,
  buildGmailComposeUrl,
  buildGmailWebComposeUrl,
  buildIosGmailComposeUrl,
  buildMailtoUrl,
  detectMailPlatform,
  getGmailLinkTarget,
  openGmailCompose,
} from '@/lib/gmail';

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; motorola edge) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

describe('detectMailPlatform', () => {
  it('identifies Android, iOS, and Desktop user agents', () => {
    expect(detectMailPlatform(ANDROID_UA)).toBe('android');
    expect(detectMailPlatform(IOS_UA)).toBe('ios');
    expect(detectMailPlatform(DESKTOP_UA)).toBe('desktop');
  });
});

describe('Gmail compose URL builders', () => {
  const to = 'builder@example.com';
  const subject = 'Microcement #1; Specs & Pricing';
  const body = 'Hi John,\n\nView guide: https://docs.google.com/document/d/abc/preview#top';

  it('builds a desktop web compose URL without hardcoding /u/0/ and uses %20 encoding', () => {
    const url = buildGmailComposeUrl(to, subject, body, DESKTOP_UA);
    expect(url).toBe(buildGmailWebComposeUrl(to, subject, body));
    expect(url.startsWith('https://mail.google.com/mail/?view=cm&fs=1&')).toBe(true);
    expect(url).not.toContain('/u/0/');
    expect(url).toContain('to=builder%40example.com');
    expect(url).toContain('su=Microcement%20%231%3B%20Specs%20%26%20Pricing');
    expect(url).toContain('body=Hi%20John%2C%0A%0AView%20guide');
  });

  it('builds an Android Intent URI targeting com.google.android.gm with mailto payload and web fallback', () => {
    const url = buildGmailComposeUrl(to, subject, body, ANDROID_UA);
    expect(url).toBe(buildAndroidGmailIntentUrl(to, subject, body));
    expect(url.startsWith('intent:builder@example.com?')).toBe(true);

    const intentIdx = url.indexOf('#Intent;');
    expect(intentIdx).toBeGreaterThan(0);

    // Everything before #Intent; must not contain raw # or ; that could break Android Intent.parseUri
    const dataSegment = url.slice('intent:'.length, intentIdx);
    expect(dataSegment).not.toContain('#');
    expect(dataSegment).not.toContain(';');
    expect(dataSegment).toContain('subject=Microcement%20%231%3B%20Specs%20%26%20Pricing');
    expect(dataSegment).toContain('body=Hi%20John%2C%0A%0AView%20guide');

    const intentFragment = url.slice(intentIdx);
    expect(intentFragment).toContain(';scheme=mailto;');
    expect(intentFragment).toContain(';package=com.google.android.gm;');
    expect(intentFragment).toContain(';S.browser_fallback_url=https%3A%2F%2Fmail.google.com%2Fmail%2F');
    expect(intentFragment.endsWith(';end')).toBe(true);
  });

  it('handles empty recipient cleanly on Android Intent URI', () => {
    const url = buildAndroidGmailIntentUrl('', 'Hello', 'Body text');
    expect(url.startsWith('intent:?subject=Hello&body=Body%20text#Intent;scheme=mailto;package=com.google.android.gm;')).toBe(true);
  });

  it('handles all-empty fields cleanly on Android Intent URI', () => {
    const url = buildAndroidGmailIntentUrl('', '', '');
    expect(url.startsWith('intent:?#Intent;scheme=mailto;package=com.google.android.gm;')).toBe(true);
  });

  it('builds an iOS googlegmail:///co deep link with subject= (not su=)', () => {
    const url = buildGmailComposeUrl(to, subject, body, IOS_UA);
    expect(url).toBe(buildIosGmailComposeUrl(to, subject, body));
    expect(url.startsWith('googlegmail:///co?')).toBe(true);
    expect(url).toContain('to=builder%40example.com');
    expect(url).toContain('subject=Microcement%20%231%3B%20Specs%20%26%20Pricing');
    expect(url).toContain('body=Hi%20John%2C%0A%0AView%20guide');
    expect(url).not.toContain('&su=');
  });

  it('keeps @ and commas unencoded in mailto: recipients per RFC 6068', () => {
    const url = buildMailtoUrl('a@example.com, b@example.com', 'Hi', 'Body');
    expect(url).toBe('mailto:a@example.com,b@example.com?subject=Hi&body=Body');
  });

  it('truncates bodies longer than 1400 chars with clipboard paste notice', () => {
    const longBody = 'A'.repeat(2000);
    const webUrl = buildGmailWebComposeUrl(to, 'Sub', longBody);
    const androidUrl = buildAndroidGmailIntentUrl(to, 'Sub', longBody);
    expect(decodeURIComponent(webUrl)).toContain('[Full message copied to clipboard');
    expect(decodeURIComponent(androidUrl)).toContain('[Full message copied to clipboard');
  });
});

describe('getGmailLinkTarget & openGmailCompose', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses _top on mobile and _blank on desktop', () => {
    expect(getGmailLinkTarget(ANDROID_UA)).toBe('_top');
    expect(getGmailLinkTarget(IOS_UA)).toBe('_top');
    expect(getGmailLinkTarget(DESKTOP_UA)).toBe('_blank');
  });

  it('creates an anchor with platform-appropriate target in openGmailCompose', () => {
    const origCreateElement = document.createElement.bind(document);
    let capturedAnchor: HTMLAnchorElement | null = null;
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = origCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        capturedAnchor = el as HTMLAnchorElement;
        vi.spyOn(el, 'click').mockImplementation(() => {});
      }
      return el;
    });

    const uaSpy = vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(ANDROID_UA);
    openGmailCompose('lead@example.com', 'Test Subject', 'Hello body');
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor!.getAttribute('href')).toMatch(/^intent:lead@example\.com\?subject=Test%20Subject&body=Hello%20body#Intent;scheme=mailto;package=com\.google\.android\.gm;/);
    expect(capturedAnchor!.target).toBe('_top');
    expect(capturedAnchor!.rel).toBe('');

    uaSpy.mockReturnValue(DESKTOP_UA);
    openGmailCompose('lead@example.com', 'Test Subject', 'Hello body');
    expect(capturedAnchor!.getAttribute('href')).toMatch(/^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&/);
    expect(capturedAnchor!.target).toBe('_blank');
    expect(capturedAnchor!.rel).toBe('noopener noreferrer');
  });
});
