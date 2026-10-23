const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GUIDES_DIR = path.join(__dirname, '..', '_guides');

// Validate a URL by checking if it returns a successful response
async function validateUrl(url, timeout = 10000) {
  try {
    const response = await axios.head(url, {
      timeout,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });
    return { valid: true, status: response.status };
  } catch (error) {
    // Try GET if HEAD fails (some servers don't support HEAD)
    try {
      const response = await axios.get(url, {
        timeout,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400,
        responseType: 'stream'
      });
      // Cancel the stream immediately
      response.data.destroy();
      return { valid: true, status: response.status };
    } catch (getError) {
      return {
        valid: false,
        error: getError.code || getError.message,
        status: getError.response?.status
      };
    }
  }
}

// Extract links from markdown content
function extractLinks(content, filename) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = [...content.matchAll(linkRegex)];

  return matches
    .filter(match => {
      const url = match[2];
      // Only check external links (http/https)
      return url.startsWith('http://') || url.startsWith('https://');
    })
    .map(match => ({
      text: match[1],
      url: match[2],
      line: content.substring(0, match.index).split('\n').length
    }));
}

// Check all guides
async function checkAllGuides() {
  const files = fs.readdirSync(GUIDES_DIR).filter(file => file.endsWith('.md'));

  console.log(`Checking links in ${files.length} guide(s)...\n`);

  let totalLinks = 0;
  let brokenLinks = 0;
  const issuesByFile = {};

  for (const file of files) {
    const filepath = path.join(GUIDES_DIR, file);
    const content = fs.readFileSync(filepath, 'utf-8');
    const links = extractLinks(content, file);

    if (links.length === 0) {
      continue;
    }

    console.log(`📄 ${file} (${links.length} external link${links.length > 1 ? 's' : ''})`);

    const issues = [];

    for (const link of links) {
      totalLinks++;
      const result = await validateUrl(link.url);

      if (result.valid) {
        console.log(`  ✓ ${link.url}`);
      } else {
        brokenLinks++;
        const statusMsg = result.status ? ` (HTTP ${result.status})` : '';
        console.log(`  ✗ ${link.url}${statusMsg}`);
        console.log(`    Error: ${result.error}`);
        console.log(`    Line: ${link.line}`);

        issues.push({
          url: link.url,
          text: link.text,
          line: link.line,
          error: result.error,
          status: result.status
        });
      }
    }

    if (issues.length > 0) {
      issuesByFile[file] = issues;
    }

    console.log('');
  }

  // Summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total links checked: ${totalLinks}`);
  console.log(`Broken links: ${brokenLinks}`);
  console.log(`Files with issues: ${Object.keys(issuesByFile).length}`);

  if (Object.keys(issuesByFile).length > 0) {
    console.log('\nBROKEN LINKS BY FILE:');
    console.log('='.repeat(60));

    for (const [file, issues] of Object.entries(issuesByFile)) {
      console.log(`\n📄 ${file}`);
      issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. [${issue.text}](${issue.url})`);
        console.log(`     Line: ${issue.line} | Error: ${issue.error}`);
      });
    }
  }

  process.exit(brokenLinks > 0 ? 1 : 0);
}

// Run
checkAllGuides().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
