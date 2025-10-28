#!/usr/bin/env node

/**
 * SEO Validation Script for Factorly
 * 
 * Checks all SEO requirements before submitting to Google Search Console
 * Run: node scripts/validate-seo.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const { green, red, yellow, blue, cyan, bold, reset } = colors;

let passed = 0;
let failed = 0;
let warnings = 0;

// Helper functions
const check = (condition, passMsg, failMsg) => {
  if (condition) {
    console.log(`${green}✓${reset} ${passMsg}`);
    passed++;
    return true;
  } else {
    console.log(`${red}✗${reset} ${failMsg}`);
    failed++;
    return false;
  }
};

const warn = (msg) => {
  console.log(`${yellow}⚠${reset} ${msg}`);
  warnings++;
};

const info = (msg) => {
  console.log(`${blue}ℹ${reset} ${msg}`);
};

const section = (title) => {
  console.log(`\n${bold}${cyan}━━━ ${title} ━━━${reset}\n`);
};

// Validation tests
console.log(`\n${bold}${blue}🔍 Factorly SEO Validation${reset}\n`);

// 1. Check robots.txt
section('1. robots.txt');
const robotsPath = join(ROOT_DIR, 'public', 'robots.txt');
if (check(existsSync(robotsPath), 'robots.txt exists', 'robots.txt NOT FOUND')) {
  const robotsContent = readFileSync(robotsPath, 'utf-8');
  check(
    robotsContent.includes('User-agent: *'),
    'Has User-agent directive',
    'Missing User-agent directive'
  );
  check(
    robotsContent.includes('Allow: /'),
    'Allows all crawling',
    'Missing Allow directive'
  );
  check(
    robotsContent.includes('https://factorly.onrender.com/sitemap.xml'),
    'Sitemap URL is correct (factorly.onrender.com)',
    'Sitemap URL is incorrect or missing'
  );
  if (robotsContent.includes('factorly.com') && !robotsContent.includes('factorly.onrender.com')) {
    warn('robots.txt uses old domain (factorly.com) instead of factorly.onrender.com');
  }
}

// 2. Check sitemap.xml
section('2. sitemap.xml');
const sitemapPath = join(ROOT_DIR, 'public', 'sitemap.xml');
if (check(existsSync(sitemapPath), 'sitemap.xml exists', 'sitemap.xml NOT FOUND')) {
  const sitemapContent = readFileSync(sitemapPath, 'utf-8');
  check(
    sitemapContent.includes('<urlset'),
    'Valid XML sitemap format',
    'Invalid sitemap format'
  );
  check(
    sitemapContent.includes('https://factorly.onrender.com'),
    'Uses correct domain (factorly.onrender.com)',
    'Uses incorrect domain'
  );
  
  // Count URLs
  const urlCount = (sitemapContent.match(/<loc>/g) || []).length;
  info(`Sitemap contains ${urlCount} URLs`);
  check(
    urlCount >= 8,
    `Has ${urlCount} URLs (including popular stocks)`,
    `Only has ${urlCount} URLs - consider adding more`
  );
  
  // Check for popular tickers
  const hasTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA'].some(ticker => 
    sitemapContent.includes(`/${ticker}`)
  );
  check(
    hasTickers,
    'Includes popular stock ticker pages',
    'Missing popular ticker pages'
  );
}

// 3. Check index.html meta tags
section('3. index.html Meta Tags');
const indexPath = join(ROOT_DIR, 'index.html');
if (check(existsSync(indexPath), 'index.html exists', 'index.html NOT FOUND')) {
  const htmlContent = readFileSync(indexPath, 'utf-8');
  
  // Title
  const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
  if (titleMatch) {
    const title = titleMatch[1];
    check(
      title.length >= 30 && title.length <= 60,
      `Title length optimal (${title.length} chars): "${title}"`,
      `Title length suboptimal (${title.length} chars): "${title}"`
    );
    check(
      title.includes('Factorly'),
      'Title includes brand name',
      'Title missing brand name'
    );
  } else {
    check(false, 'Has title tag', 'Missing title tag');
  }
  
  // Meta description
  const descMatch = htmlContent.match(/<meta name="description" content="(.*?)"/);
  if (descMatch) {
    const desc = descMatch[1];
    check(
      desc.length >= 120 && desc.length <= 160,
      `Description length optimal (${desc.length} chars)`,
      `Description length suboptimal (${desc.length} chars)`
    );
  } else {
    check(false, 'Has meta description', 'Missing meta description');
  }
  
  // Robots meta
  check(
    htmlContent.includes('name="robots"') && htmlContent.includes('index, follow'),
    'Robots meta tag allows indexing',
    'Robots meta tag missing or blocking indexing'
  );
  
  // Canonical URL
  const canonicalMatch = htmlContent.match(/<link rel="canonical" href="(.*?)"/);
  if (canonicalMatch) {
    const canonical = canonicalMatch[1];
    check(
      canonical === 'https://factorly.onrender.com/',
      `Canonical URL correct: ${canonical}`,
      `Canonical URL incorrect: ${canonical}`
    );
  } else {
    check(false, 'Has canonical URL', 'Missing canonical URL');
  }
  
  // Open Graph
  check(
    htmlContent.includes('property="og:title"'),
    'Has Open Graph title',
    'Missing Open Graph title'
  );
  check(
    htmlContent.includes('property="og:description"'),
    'Has Open Graph description',
    'Missing Open Graph description'
  );
  check(
    htmlContent.includes('property="og:image"'),
    'Has Open Graph image tag',
    'Missing Open Graph image tag'
  );
  check(
    htmlContent.includes('property="og:url"') && htmlContent.includes('https://factorly.onrender.com'),
    'Open Graph URL is correct',
    'Open Graph URL missing or incorrect'
  );
  
  // Twitter Cards
  check(
    htmlContent.includes('name="twitter:card"'),
    'Has Twitter Card meta tags',
    'Missing Twitter Card meta tags'
  );
  check(
    htmlContent.includes('summary_large_image'),
    'Twitter Card uses large image format',
    'Twitter Card not using large image format'
  );
  
  // Manifest
  check(
    htmlContent.includes('<link rel="manifest"'),
    'Has PWA manifest link',
    'Missing PWA manifest link'
  );
}

// 4. Check manifest.json
section('4. PWA Manifest');
const manifestPath = join(ROOT_DIR, 'public', 'manifest.json');
if (check(existsSync(manifestPath), 'manifest.json exists', 'manifest.json NOT FOUND')) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    check(
      manifest.name && manifest.name.includes('Factorly'),
      'Has app name',
      'Missing app name'
    );
    check(
      manifest.short_name,
      'Has short name',
      'Missing short name'
    );
    check(
      manifest.icons && manifest.icons.length > 0,
      `Has ${manifest.icons?.length || 0} icon definitions`,
      'Missing icon definitions'
    );
    check(
      manifest.start_url === '/',
      'Start URL is correct',
      'Start URL incorrect'
    );
  } catch (e) {
    check(false, 'manifest.json is valid JSON', 'manifest.json has syntax errors');
  }
}

// 5. Check structured data
section('5. Structured Data (JSON-LD)');
if (existsSync(indexPath)) {
  const htmlContent = readFileSync(indexPath, 'utf-8');
  
  const jsonLdMatches = htmlContent.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (jsonLdMatches) {
    info(`Found ${jsonLdMatches.length} JSON-LD schemas`);
    
    jsonLdMatches.forEach((match, idx) => {
      try {
        const jsonContent = match.replace(/<script type="application\/ld\+json">|<\/script>/g, '').trim();
        const schema = JSON.parse(jsonContent);
        
        if (schema['@type'] === 'WebApplication') {
          check(true, 'Has WebApplication schema', '');
          check(
            schema.url === 'https://factorly.onrender.com',
            'WebApplication URL is correct',
            `WebApplication URL is incorrect: ${schema.url}`
          );
        } else if (schema['@type'] === 'Organization') {
          check(true, 'Has Organization schema', '');
          check(
            schema.url === 'https://factorly.onrender.com',
            'Organization URL is correct',
            `Organization URL is incorrect: ${schema.url}`
          );
        } else if (schema['@type'] === 'FAQPage') {
          check(true, 'Has FAQPage schema', '');
          info(`  FAQPage has ${schema.mainEntity?.length || 0} questions`);
        } else {
          info(`  Schema type: ${schema['@type']}`);
        }
      } catch (e) {
        warn(`Schema ${idx + 1} has JSON syntax errors`);
      }
    });
  } else {
    warn('No JSON-LD structured data found');
  }
}

// 6. Check critical assets
section('6. Critical Assets');
const logoPath = join(ROOT_DIR, 'public', 'logo.png');
check(existsSync(logoPath), 'logo.png exists', 'logo.png NOT FOUND');

const ogImagePath = join(ROOT_DIR, 'public', 'og-image.png');
check(existsSync(ogImagePath), 'og-image.png exists', 'og-image.png NOT FOUND (CRITICAL!)');
if (!existsSync(ogImagePath)) {
  warn('Social media sharing will fail without og-image.png');
  warn('See docs/CREATE_OG_IMAGES.md for instructions');
}

const twitterImagePath = join(ROOT_DIR, 'public', 'twitter-card.png');
check(existsSync(twitterImagePath), 'twitter-card.png exists', 'twitter-card.png NOT FOUND (CRITICAL!)');
if (!existsSync(twitterImagePath)) {
  warn('Twitter sharing will fail without twitter-card.png');
  warn('Can reuse og-image.png if needed');
}

// 7. Check Google verification
section('7. Google Search Console Verification');
const googleVerificationPath = join(ROOT_DIR, 'public', '.well-known');
if (existsSync(googleVerificationPath)) {
  check(true, 'Has .well-known directory', '');
  // Check for Google verification file
  const files = readdirSync(googleVerificationPath);
  const hasGoogleFile = files.some(f => f.startsWith('google'));
  check(hasGoogleFile, 'Has Google verification file', 'No Google verification file found');
} else {
  warn('.well-known directory not found - add Google Search Console verification file');
}

// 8. Check render.yaml configuration
section('8. Render.yaml Configuration');
const renderYamlPath = join(ROOT_DIR, 'render.yaml');
if (check(existsSync(renderYamlPath), 'render.yaml exists', 'render.yaml NOT FOUND')) {
  const renderContent = readFileSync(renderYamlPath, 'utf-8');
  
  // Check SPA routing
  const hasRewrite = renderContent.includes('type: rewrite') && 
                     renderContent.includes('source: /*') &&
                     renderContent.includes('destination: /index.html');
  check(
    hasRewrite,
    'SPA routing configured (/* → /index.html)',
    'Missing SPA routing - stock pages may 404'
  );
  
  // Check cache headers
  check(
    renderContent.includes('Cache-Control'),
    'Has cache control headers',
    'Missing cache control headers'
  );
}

// Summary
section('Summary');
console.log(`${bold}Results:${reset}`);
console.log(`  ${green}✓ Passed:${reset}   ${passed}`);
console.log(`  ${red}✗ Failed:${reset}   ${failed}`);
console.log(`  ${yellow}⚠ Warnings:${reset} ${warnings}`);

const totalChecks = passed + failed;
const score = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 0;

console.log(`\n${bold}SEO Score: ${score}%${reset}`);

if (score === 100) {
  console.log(`\n${green}${bold}🎉 Perfect! Your SEO is production-ready!${reset}`);
  console.log(`\n${cyan}Next steps:${reset}`);
  console.log(`  1. Submit sitemap to Google Search Console`);
  console.log(`  2. Request indexing for homepage`);
  console.log(`  3. Monitor indexing status in Search Console`);
} else if (score >= 90) {
  console.log(`\n${green}${bold}✓ Excellent! SEO is mostly ready.${reset}`);
  console.log(`\n${yellow}Fix the ${failed} failed check(s) above before submitting to Google.${reset}`);
} else if (score >= 70) {
  console.log(`\n${yellow}${bold}⚠ Good, but needs improvement.${reset}`);
  console.log(`\n${red}Address the ${failed} failed check(s) before going live.${reset}`);
} else {
  console.log(`\n${red}${bold}✗ SEO needs significant work.${reset}`);
  console.log(`\n${red}Fix all failed checks before submitting to Google Search Console.${reset}`);
}

console.log(`\n${cyan}Full checklist: docs/SEO_CHECKLIST.md${reset}`);
console.log(`${cyan}OG images guide: docs/CREATE_OG_IMAGES.md${reset}\n`);

// Exit with error code if critical issues
process.exit(failed > 0 ? 1 : 0);
