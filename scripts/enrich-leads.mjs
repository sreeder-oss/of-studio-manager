#!/usr/bin/env node
/**
 * Organic Finishes LLC — Pre-Folder Lead Enrichment & Email Verification Engine
 *
 * Accepts any combination of CSV spreadsheets and Markdown-exported Google Docs
 * (such as `Company / Website`), deduplicates leads across sources, crawls each
 * company's live website + contact pages, checks live DNS MX records, rejects
 * staging/junk domains, and outputs:
 *   1. Clean verified CSV (ready for Google Sheets & OF Studio Manager import)
 *   2. Human-readable Markdown report (ready for Google Docs)
 *   3. JSON audit report with source URLs & email credibility status
 *
 * Usage:
 *   node scripts/enrich-leads.mjs --out-dir /tmp/of_leads file1.md file2.csv ...
 */

import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';

const JUNK_EMAIL_DOMAINS = new Set([
  'sg-host.com',
  'wixpress.com',
  'wix.com',
  'sentry.io',
  'sentry-next.wixpress.com',
  'squarespace.com',
  'godaddy.com',
  'example.com',
  'test.com',
  'domain.com',
  'email.com',
  'yoursite.com',
  'yourdomain.com',
  'wordpress.com',
  'wordpress.org',
  'w3.org',
  'schema.org',
  'cloudflare.com',
  'googleapis.com',
  'gstatic.com',
  'google.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'linkedin.com',
  'houzz.com',
  'pinterest.com',
  'tiktok.com',
  'amazonaws.com',
  'jsdelivr.net',
  'fontawesome.com',
  'jquery.com',
  'shopify.com',
  'hubspot.com',
  'mailchimp.com',
  'constantcontact.com',
  'typekit.net',
  'adobe.com',
  'apple.com',
  'microsoft.com',
  'ueniweb.com',
]);

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'aol.com',
  'cox.net',
  'sbcglobal.net',
  'att.net',
  'me.com',
  'live.com',
  'msn.com',
  'comcast.net',
  'proton.me',
  'protonmail.com',
]);

const BAD_LOCAL_PARTS = /^(no-?reply|donotreply|bounce|mailer-daemon|postmaster|abuse|privacy|legal|dmca|security|webmaster|hostmaster|root|unsubscribe|notifications?|alerts?|support|helpdesk|careers|jobs|hr|recruiting|press|media|pr|marketing|spam|example|user|name|yourname|someone)$/i;
const IMAGE_OR_ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|ttf|eot|pdf|mp4|webm)$/i;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}/g;

const KNOWN_WEBSITE_OVERRIDES = {
  'rk contractors': 'https://www.rkcontractorskc.com',
  'snyder construction group': 'https://snydercg.com',
  'rio contracting': 'https://www.bransonchamber.com/listing/rio-contracting-llc/3787/',
  'tcp commercial contractors': 'https://tcpbuilding.com',
  'mel bean interiors': 'https://melbeaninteriors.com',
  'nabholz': 'https://www.nabholz.com',
  'rick scott construction': 'https://rickscottconstruction.com',
  'miller-tippens': 'https://www.miller-tippens.com',
};

function stripLegalSuffix(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(llc|inc|corp|corporation|co|company|ltd|group|studio|firm|interior design|interiors|design|custom homes|homes|contractors?|construction|build|design\s*\+?\s*build)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeCompanyKey(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[—–-].*?(tulsa|edmond|okc)$/i, '')
    .replace(/\b(llc|inc\.?|corp\.?|corporation|co\.?)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.length >= 10 ? digits.slice(0, 10) : '';
}

function formatPhone(digits) {
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

function extractRootDomain(urlOrHost) {
  if (!urlOrHost) return '';
  let s = String(urlOrHost).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#\s]/)[0];
  if (!s.includes('.') || s.includes('@')) return '';
  if (/(instagram|facebook|linkedin|houzz|thumbtack|birdeye|bransonchamber)\.com$/i.test(s)) return '';
  return s;
}

function isJunkEmail(email) {
  if (!email) return true;
  const e = email.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/.test(e)) return true;
  if (IMAGE_OR_ASSET_EXT.test(e)) return true;
  const [local, domain] = e.split('@');
  if (!local || !domain) return true;
  if (BAD_LOCAL_PARTS.test(local)) return true;
  if (local.length > 48 || domain.length > 80) return true;
  if (JUNK_EMAIL_DOMAINS.has(domain)) return true;
  for (const junk of JUNK_EMAIL_DOMAINS) {
    if (domain.endsWith('.' + junk)) return true;
  }
  return false;
}

function decodeCfEmail(hex) {
  try {
    const key = parseInt(hex.slice(0, 2), 16);
    let out = '';
    for (let i = 2; i < hex.length; i += 2) {
      out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
    }
    return out;
  } catch {
    return '';
  }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function extractEmailsFromHtml(html) {
  const found = new Set();
  const decoded = decodeHtmlEntities(html);

  // 1. Cloudflare email obfuscation
  for (const m of decoded.matchAll(/data-cfemail="([0-9a-fA-F]+)"/g)) {
    const e = decodeCfEmail(m[1]).trim().toLowerCase();
    if (!isJunkEmail(e)) found.add(e);
  }

  // 2. mailto: links (highest confidence)
  for (const m of decoded.matchAll(/mailto:([^"'?\s<>#]+)/gi)) {
    let raw = m[1];
    try {
      raw = decodeURIComponent(raw);
    } catch {
      /* ignore */
    }
    for (const part of raw.split(/[,;]/)) {
      const e = part.trim().toLowerCase();
      if (!isJunkEmail(e)) found.add(e);
    }
  }

  // 3. Visible text / JSON-LD / HTML emails
  const stripped = decoded
    .replace(/<script[\s\S]*?<\/script>/gi, (m) => (m.includes('application/ld+json') ? m : ' '))
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  for (const m of stripped.matchAll(EMAIL_REGEX)) {
    const e = m[0].trim().toLowerCase();
    if (!isJunkEmail(e)) found.add(e);
  }

  return [...found];
}

function extractCandidateLinks(html, baseUrl) {
  const links = new Set();
  let originHost = '';
  try {
    originHost = new URL(baseUrl).hostname.replace(/^www\./, '');
  } catch {
    return [];
  }

  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    const href = m[1].trim();
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const u = new URL(href, baseUrl);
      const host = u.hostname.replace(/^www\./, '');
      if (host !== originHost) continue;
      if (/\/(contact|contact-us|about|about-us|team|our-team|people|estimating|subcontractors?|bid|bids|inquire|inquiry|connect|get-in-touch|studio)/i.test(u.pathname)) {
        links.add(u.origin + u.pathname);
      }
    } catch {
      /* ignore */
    }
  }
  return [...links].slice(0, 6);
}

function extractInstagramFromHtml(html) {
  const m = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (m && !/^(p|reel|stories|explore|accounts|share)$/i.test(m[1])) {
    return '@' + m[1].replace(/\/$/, '');
  }
  return null;
}

const mxCache = new Map();
async function checkDomainMx(domain) {
  const d = domain.toLowerCase().trim();
  if (mxCache.has(d)) return mxCache.get(d);
  try {
    const records = await dns.resolveMx(d);
    const valid = Array.isArray(records) && records.length > 0;
    mxCache.set(d, valid);
    return valid;
  } catch {
    // Fallback: RFC 5321 allows A record when MX absent, check resolve4
    try {
      const a = await dns.resolve4(d);
      const valid = Array.isArray(a) && a.length > 0;
      mxCache.set(d, valid);
      return valid;
    } catch {
      mxCache.set(d, false);
      return false;
    }
  }
}

async function fetchPage(url, timeoutMs = 9000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!resp.ok) return { ok: false, status: resp.status, url: resp.url, html: '' };
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('text/') && !ct.includes('html') && !ct.includes('xml')) {
      return { ok: false, status: resp.status, url: resp.url, html: '' };
    }
    const html = (await resp.text()).slice(0, 350_000);
    return { ok: true, status: resp.status, url: resp.url, html };
  } catch (e) {
    return { ok: false, status: 0, url, html: '', error: String(e?.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

function rankEmails(emails, siteDomain) {
  return [...emails].sort((a, b) => {
    const score = (e) => {
      const [local, dom] = e.split('@');
      let s = 0;
      if (siteDomain && (dom === siteDomain || dom.endsWith('.' + siteDomain))) s += 100;
      if (/^(estimating|bids|bidding|precon|proposals)$/i.test(local)) s += 50;
      if (/^(info|hello|contact|office|design|studio|inquiries|projects|sales)$/i.test(local)) s += 35;
      if (FREE_EMAIL_DOMAINS.has(dom)) s -= 10;
      return s;
    };
    return score(b) - score(a);
  });
}

async function crawlWebsiteForContact(websiteUrl) {
  if (!websiteUrl) return { reachable: false, emails: [], sourceUrl: null, hasContactForm: false, instagram: null };
  const normalized = /^https?:\/\//i.test(websiteUrl) ? websiteUrl : `https://${websiteUrl}`;
  const home = await fetchPage(normalized);
  if (!home.ok) {
    // Try www. fallback or http fallback
    const alt = normalized.includes('://www.')
      ? normalized.replace('://www.', '://')
      : normalized.replace('://', '://www.');
    const retry = await fetchPage(alt);
    if (!retry.ok) {
      return { reachable: false, emails: [], sourceUrl: null, hasContactForm: false, instagram: null };
    }
    Object.assign(home, retry);
  }

  const allEmails = new Map(); // email -> sourceUrl
  const addEmails = (list, src) => {
    for (const e of list) {
      if (!allEmails.has(e)) allEmails.set(e, src);
    }
  };

  addEmails(extractEmailsFromHtml(home.html), home.url);
  let hasContactForm = /<form[\s\S]*?(?:email|message|contact|inquiry)/i.test(home.html);
  let instagram = extractInstagramFromHtml(home.html);

  const origin = new URL(home.url).origin;
  const siteDomain = new URL(home.url).hostname.replace(/^www\./, '');
  const candidateUrls = new Set([
    ...extractCandidateLinks(home.html, home.url),
    `${origin}/contact`,
    `${origin}/contact-us`,
    `${origin}/about`,
  ]);
  candidateUrls.delete(home.url);

  // Crawl up to 5 internal contact/about pages concurrently
  const toCrawl = [...candidateUrls].slice(0, 5);
  const pages = await Promise.all(toCrawl.map((u) => fetchPage(u, 7000)));
  for (const p of pages) {
    if (!p.ok) continue;
    addEmails(extractEmailsFromHtml(p.html), p.url);
    if (!hasContactForm && /<form[\s\S]*?(?:email|message|contact|inquiry)/i.test(p.html)) {
      hasContactForm = true;
    }
    if (!instagram) instagram = extractInstagramFromHtml(p.html);
  }

  const ranked = rankEmails([...allEmails.keys()], siteDomain);
  return {
    reachable: true,
    finalUrl: home.url,
    emails: ranked,
    sourceMap: Object.fromEntries(allEmails),
    sourceUrl: ranked.length ? allEmails.get(ranked[0]) : home.url,
    hasContactForm,
    instagram,
  };
}

// --- Simple RFC 4180 CSV parser ---
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field.trim());
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field.trim());
    if (row.some((c) => c !== '')) rows.push(row);
  }
  return rows;
}

function parseMarkdownTable(text, sourceLabel) {
  const leads = [];
  const lines = text.split(/\r?\n/);
  let headers = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed
      .slice(1, trimmed.endsWith('|') ? -1 : undefined)
      .split('|')
      .map((c) => c.trim().replace(/\\-/g, '-').replace(/\\_/g, '_').replace(/\\\+/g, '+'));
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!headers) {
      headers = cells.map((h) => h.toLowerCase());
      continue;
    }
    const get = (pat) => {
      const idx = headers.findIndex((h) => pat.test(h));
      return idx >= 0 ? (cells[idx] || '') : '';
    };
    const rawCompany = get(/company|firm|name/);
    if (!rawCompany) continue;

    // Extract website or contact name from parentheses in company column
    let company = rawCompany;
    let website = '';
    let contactPerson = '';
    const parenMatches = [...rawCompany.matchAll(/\(([^)]+)\)/g)];
    for (const m of parenMatches) {
      const inner = m[1].trim();
      if (/[a-z0-9-]+\.[a-z]{2,}/i.test(inner) && !inner.includes(' ')) {
        website = inner;
      } else if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(inner)) {
        contactPerson = inner;
      }
      company = company.replace(m[0], '').trim();
    }

    const phoneRegion = get(/phone|region|city/);
    const igRaw = get(/instagram/);
    const emailNotes = get(/email|notes/);
    const statusRaw = get(/status/);

    const phoneMatch = (phoneRegion + ' ' + emailNotes).match(/(\d{3}[-.\s]\d{3}[-.\s]\d{4})/);
    const phone = phoneMatch ? phoneMatch[1] : '';
    let region = phoneRegion
      .replace(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/g, '')
      .replace(/\(Web form\)/gi, '')
      .replace(/^\s*[-–]\s*$/, '')
      .replace(/^\((.+)\)$/, '$1')
      .trim();

    // Extract emails from markdown links [a@b.com](mailto:a@b.com) or bare
    const emails = [...new Set((emailNotes.match(EMAIL_REGEX) || []).map((e) => e.toLowerCase()))];
    if (!website) {
      const siteMatch = emailNotes.match(/\b([a-z0-9-]+\.(?:com|co|net|org|design|pro|construction|us))\b/i);
      if (siteMatch && !FREE_EMAIL_DOMAINS.has(siteMatch[1].toLowerCase()) && !siteMatch[1].endsWith('sg-host.com')) {
        website = siteMatch[1];
      }
    }

    const igMatch = igRaw.match(/@[a-zA-Z0-9._]+/);
    const sent = /sent/i.test(statusRaw) || /\(Status:\s*Sent\)/i.test(emailNotes);

    leads.push({
      name: company,
      category: '',
      region,
      contactPerson,
      emails,
      phone,
      website,
      instagram: igMatch ? igMatch[0] : '',
      sent,
      notes: emailNotes.replace(/\[([^\]]+)\]\(mailto:[^)]+\)/g, '$1').trim(),
      sources: [sourceLabel],
    });
  }
  return leads;
}

function parseCsvLeads(text, sourceLabel) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.toLowerCase());
  const get = (row, pat) => {
    const idx = headers.findIndex((h) => pat.test(h));
    return idx >= 0 ? (row[idx] || '').trim() : '';
  };

  return rows.slice(1).map((row) => {
    const name = get(row, /company|firm|name/);
    const category = get(row, /category|segment/);
    const region = get(row, /city|region|state|address/);
    const contactCol = get(row, /contact.*phone|key contact/);
    const emailCol = get(row, /direct email|email/);
    const phoneCol = get(row, /^phone$/);
    const webCol = get(row, /website|instagram/);
    const statusCol = get(row, /status/);
    const notesCol = get(row, /specialty|pitch|notes/);

    const combinedForEmail = `${emailCol} ${contactCol}`;
    const emails = [...new Set((combinedForEmail.match(EMAIL_REGEX) || []).map((e) => e.toLowerCase()))];

    const combinedForPhone = `${phoneCol} ${contactCol}`;
    const phoneMatch = combinedForPhone.match(/(\d{3}[-.\s]\d{3}[-.\s]\d{4})/);
    const phone = phoneMatch ? phoneMatch[1] : '';

    const igMatch = webCol.match(/@[a-zA-Z0-9._]+/);
    const siteMatch = webCol.match(/\b([a-z0-9-]+\.(?:com|co|net|org|design|pro|construction|us))\b/i);
    let contactPerson = '';
    if (headers.some((h) => /key contact/.test(h))) {
      contactPerson = get(row, /key contact/);
    } else if (contactCol) {
      const firstPart = contactCol.split('|')[0].trim();
      if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(firstPart)) {
        contactPerson = firstPart;
      }
    }

    return {
      name,
      category,
      region,
      contactPerson,
      emails,
      phone,
      website: siteMatch ? siteMatch[1] : '',
      instagram: igMatch ? igMatch[0] : '',
      sent: /\bsent\b/i.test(statusCol),
      notes: notesCol,
      sources: [sourceLabel],
    };
  }).filter((l) => l.name);
}

function mergeLeads(rawLeads) {
  const merged = [];

  const findMatch = (lead) => {
    const phone = normalizePhone(lead.phone);
    const domain = extractRootDomain(lead.website);
    const normName = normalizeCompanyKey(lead.name);
    const coreName = stripLegalSuffix(lead.name);

    for (const existing of merged) {
      const exPhone = normalizePhone(existing.phone);
      const exDomain = extractRootDomain(existing.website);
      const exNorm = normalizeCompanyKey(existing.name);
      const exCore = stripLegalSuffix(existing.name);

      // Keep distinct branch offices (e.g. Hoffman Custom Homes — Tulsa vs Edmond/OKC) separate when emails differ
      const isBranchVariant = /—/.test(lead.name) || /—/.test(existing.name);
      if (isBranchVariant && lead.name.toLowerCase() !== existing.name.toLowerCase()) {
        continue;
      }

      if (phone && exPhone && phone === exPhone) return existing;
      if (domain && exDomain && domain === exDomain) return existing;
      if (normName && exNorm && normName === exNorm) return existing;
      if (coreName && exCore && coreName.length >= 6 && coreName === exCore) return existing;
    }
    return null;
  };

  for (const lead of rawLeads) {
    const target = findMatch(lead);
    if (!target) {
      merged.push({
        ...lead,
        emails: [...new Set(lead.emails)],
        sources: [...new Set(lead.sources)],
      });
    } else {
      // Prefer longer / cleaner company name unless existing has full LLC/Inc
      if (lead.name.length > target.name.length && !/—/.test(target.name)) {
        target.name = lead.name;
      }
      if (!target.category && lead.category) target.category = lead.category;
      if ((!target.region || lead.region.length > target.region.length) && lead.region && lead.region !== '-') {
        target.region = lead.region;
      }
      if (!target.contactPerson && lead.contactPerson) target.contactPerson = lead.contactPerson;
      if (!target.phone && lead.phone) target.phone = lead.phone;
      if (!target.website && lead.website) target.website = lead.website;
      if (!target.instagram && lead.instagram) target.instagram = lead.instagram;
      if (lead.sent) target.sent = true;
      for (const e of lead.emails) {
        if (!target.emails.includes(e)) target.emails.push(e);
      }
      if (lead.notes && (!target.notes || lead.notes.length > target.notes.length)) {
        target.notes = lead.notes;
      }
      for (const s of lead.sources) {
        if (!target.sources.includes(s)) target.sources.push(s);
      }
    }
  }
  return merged;
}

async function verifyAndEnrichLead(lead) {
  // Derive website from override or non-free email domain if missing
  let website = lead.website;
  const lowerName = lead.name.toLowerCase();
  for (const [key, url] of Object.entries(KNOWN_WEBSITE_OVERRIDES)) {
    if (lowerName.includes(key)) {
      website = website || url;
      break;
    }
  }
  if (!website) {
    for (const e of lead.emails) {
      const dom = e.split('@')[1];
      if (dom && !FREE_EMAIL_DOMAINS.has(dom) && !isJunkEmail(e)) {
        website = `https://${dom}`;
        break;
      }
    }
  }

  // Filter out obviously bogus existing emails (e.g., sg-host.com)
  const existingValidSyntax = lead.emails.filter((e) => !isJunkEmail(e));
  const flaggedBogus = lead.emails.filter((e) => isJunkEmail(e));

  // Crawl website + contact pages
  const crawl = await crawlWebsiteForContact(website);
  if (!lead.instagram && crawl.instagram) {
    lead.instagram = crawl.instagram;
  }

  // Check MX for all candidate emails (existing + crawled)
  const allCandidates = [...new Set([...existingValidSyntax, ...crawl.emails])];
  const mxResults = {};
  for (const e of allCandidates) {
    const dom = e.split('@')[1];
    mxResults[e] = await checkDomainMx(dom);
  }

  const crawledSet = new Set(crawl.emails);
  const verifiedOnSiteExisting = existingValidSyntax.filter((e) => crawledSet.has(e) && mxResults[e]);
  const newlyDiscovered = crawl.emails.filter((e) => !existingValidSyntax.includes(e) && mxResults[e]);
  const mxOnlyExisting = existingValidSyntax.filter((e) => !crawledSet.has(e) && mxResults[e]);
  const deadDomainExisting = existingValidSyntax.filter((e) => !mxResults[e]);

  let primaryEmail = null;
  let secondaryEmails = [];
  let emailStatus = 'No Email Found';
  let sourceUrl = crawl.sourceUrl || (website ? (/^https?:/.test(website) ? website : `https://${website}`) : '');

  if (verifiedOnSiteExisting.length > 0) {
    primaryEmail = verifiedOnSiteExisting[0];
    secondaryEmails = [...new Set([...verifiedOnSiteExisting.slice(1), ...newlyDiscovered, ...mxOnlyExisting])];
    emailStatus = 'Verified (On Website)';
    sourceUrl = crawl.sourceMap?.[primaryEmail] || crawl.finalUrl || sourceUrl;
  } else if (newlyDiscovered.length > 0) {
    primaryEmail = newlyDiscovered[0];
    secondaryEmails = [...new Set([...newlyDiscovered.slice(1), ...mxOnlyExisting])];
    emailStatus = existingValidSyntax.length === 0 ? 'Verified (Found on Website)' : 'Verified (Found on Website + Doc Email)';
    sourceUrl = crawl.sourceMap?.[primaryEmail] || crawl.finalUrl || sourceUrl;
  } else if (mxOnlyExisting.length > 0) {
    primaryEmail = mxOnlyExisting[0];
    secondaryEmails = mxOnlyExisting.slice(1);
    const dom = primaryEmail.split('@')[1];
    emailStatus = FREE_EMAIL_DOMAINS.has(dom)
      ? 'MX Valid (Personal/Gmail — Unverified on Site)'
      : 'MX Valid (Domain Active — Not Shown on Site)';
  } else if (flaggedBogus.length > 0 || deadDomainExisting.length > 0) {
    emailStatus = crawl.hasContactForm
      ? 'Web Form Only (Replaced Bad/Temp Email)'
      : lead.instagram
        ? 'IG DM Only (Replaced Bad/Temp Email)'
        : 'Flagged (Invalid/Dead Email)';
  } else if (crawl.hasContactForm) {
    emailStatus = 'Web Form Only';
  } else if (lead.instagram) {
    emailStatus = 'IG DM Only';
  }

  return {
    name: lead.name,
    category: lead.category || 'Interior Design / Builder',
    region: lead.region || '',
    contactPerson: lead.contactPerson || '',
    primaryEmail,
    secondaryEmails,
    emailStatus,
    flaggedBadEmails: [...flaggedBogus, ...deadDomainExisting],
    phone: formatPhone(normalizePhone(lead.phone)) || lead.phone || '',
    website: crawl.finalUrl || (website ? (/^https?:/.test(website) ? website : `https://${website}`) : ''),
    websiteReachable: crawl.reachable,
    instagram: lead.instagram || '',
    sourceUrl,
    sent: lead.sent,
    notes: lead.notes || '',
    sources: lead.sources,
  };
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(leads) {
  const header = [
    'Company Name',
    'Category',
    'City & State',
    'Contact Person',
    'Verified Email',
    'Additional Emails',
    'Email Credibility',
    'Outreach Status',
    'Phone',
    'Website',
    'Instagram',
    'Verification Source URL',
    'Notes',
  ];
  const lines = [header.map(csvEscape).join(',')];
  for (const l of leads) {
    lines.push(
      [
        l.name,
        l.category,
        l.region,
        l.contactPerson,
        l.primaryEmail || '',
        l.secondaryEmails.join('; '),
        l.emailStatus,
        l.sent ? 'Sent' : l.primaryEmail ? 'Ready to Send' : 'Alt Channel',
        l.phone,
        l.website,
        l.instagram,
        l.sourceUrl,
        l.notes,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return lines.join('\n') + '\n';
}

function toMarkdownDoc(leads) {
  const verified = leads.filter((l) => l.emailStatus.startsWith('Verified'));
  const mxValid = leads.filter((l) => l.emailStatus.startsWith('MX Valid'));
  const altChannel = leads.filter((l) => !l.primaryEmail);

  const row = (l) =>
    `| ${l.name} | ${l.region || '-'} | ${l.primaryEmail || '*(No public email)*'} | ${l.emailStatus} | ${l.sent ? 'Sent' : 'To Send'} | ${l.phone || '-'} | ${l.instagram || l.website || '-'} |`;

  return [
    '# Organic Finishes LLC — Master Verified Outreach Leads',
    '',
    `**Last Verified:** ${new Date().toISOString().slice(0, 10)}  `,
    `**Total Unique Companies:** ${leads.length} (deduplicated from all Drive sheets + Company/Website Doc)  `,
    `- **Website-Verified Emails:** ${verified.length}`,
    `- **MX-Valid Emails (Active Mail Server, Not Listed on Homepage/Contact Page):** ${mxValid.length}`,
    `- **Web Form / Instagram DM Only (No Public Email):** ${altChannel.length}`,
    '',
    '## 1. Ready-to-Email Leads (Verified & MX-Valid)',
    '',
    '| Company | Region | Primary Email | Credibility | Status | Phone | Website / IG |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
    ...[...verified, ...mxValid].map(row),
    '',
    '## 2. Web Form / Instagram DM Only (No Public Email Found)',
    '',
    '| Company | Region | Email | Channel / Notes | Status | Phone | Website / IG |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
    ...altChannel.map(row),
    '',
  ].join('\n');
}

async function runPool(items, concurrency, worker) {
  const out = new Array(items.length);
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  let outDir = '/tmp/of_leads';
  const inputFiles = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out-dir' && args[i + 1]) {
      outDir = args[++i];
    } else {
      inputFiles.push(args[i]);
    }
  }
  if (inputFiles.length === 0) {
    console.error('Usage: node scripts/enrich-leads.mjs --out-dir <dir> <file1.md|csv> [...]');
    process.exit(1);
  }

  const rawLeads = [];
  for (const f of inputFiles) {
    const content = fs.readFileSync(f, 'utf8');
    const label = path.basename(f);
    if (f.endsWith('.md')) {
      rawLeads.push(...parseMarkdownTable(content, label));
    } else {
      rawLeads.push(...parseCsvLeads(content, label));
    }
  }

  const deduped = mergeLeads(rawLeads);
  console.log(`Loaded ${rawLeads.length} raw rows -> ${deduped.length} unique companies. Starting live website + MX verification...`);

  const results = await runPool(deduped, 8, async (lead) => verifyAndEnrichLead(lead));

  fs.mkdirSync(outDir, { recursive: true });
  const emailReady = results.filter((r) => Boolean(r.primaryEmail));
  fs.writeFileSync(path.join(outDir, 'master_verified.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(outDir, 'master_verified_all.csv'), toCsv(results));
  fs.writeFileSync(path.join(outDir, 'master_verified_email_ready.csv'), toCsv(emailReady));
  fs.writeFileSync(path.join(outDir, 'master_verified_doc.md'), toMarkdownDoc(results));

  const counts = {};
  for (const r of results) counts[r.emailStatus] = (counts[r.emailStatus] || 0) + 1;
  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log(`Total unique companies: ${results.length}`);
  console.log(`Email-ready:            ${emailReady.length}`);
  console.log(`No public email:        ${results.length - emailReady.length}`);
  console.log('Breakdown by credibility:', counts);
  const flagged = results.filter((r) => r.flaggedBadEmails.length > 0);
  if (flagged.length) {
    console.log('\nFlagged bogus/dead emails caught:');
    for (const f of flagged) console.log(`  - ${f.name}: bad=[${f.flaggedBadEmails.join(', ')}] -> replaced_with=${f.primaryEmail || 'NONE'}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
