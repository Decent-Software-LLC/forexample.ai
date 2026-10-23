const fs = require('fs');
const path = require('path');

const GUIDES_DIR = path.join(__dirname, '..', '_guides');

function removeEmptyFurtherReading(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');

  // Check if Further Reading section exists
  if (!content.includes('## Further Reading')) {
    return { modified: false };
  }

  // Check if there are any markdown links after Further Reading
  const furtherReadingMatch = content.match(/## Further Reading\n([\s\S]*?)(?=\n## |$)/);

  if (!furtherReadingMatch) {
    return { modified: false };
  }

  const sectionContent = furtherReadingMatch[1];

  // Check if section has actual markdown links
  const hasLinks = /\[.*?\]\(https?:\/\/.*?\)/.test(sectionContent);

  if (!hasLinks) {
    // Remove the entire Further Reading section
    const newContent = content.replace(/\n## Further Reading\n[\s\S]*?(?=\n## Related Guides|\n## |$)/, '');
    fs.writeFileSync(filepath, newContent);
    return { modified: true };
  }

  return { modified: false };
}

function main() {
  console.log('🗑️  Removing Empty Further Reading Sections\n');

  const guideFiles = fs.readdirSync(GUIDES_DIR)
    .filter(file => file.endsWith('.md'))
    .sort();

  let removed = 0;

  for (const file of guideFiles) {
    const filepath = path.join(GUIDES_DIR, file);
    const result = removeEmptyFurtherReading(filepath);

    if (result.modified) {
      console.log(`✓  ${file}: Removed empty Further Reading`);
      removed++;
    }
  }

  console.log(`\n✨ Removed ${removed} empty sections\n`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
