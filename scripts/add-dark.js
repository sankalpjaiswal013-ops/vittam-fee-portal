const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      if (full.endsWith('.tsx') || full.endsWith('.ts')) {
        results.push(full);
      }
    }
  });
  return results;
};

const files = [...walk('./app'), ...walk('./components')];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Add dark classes where the class exactly matches and is not already prefixed by dark:
  // Using negative lookbehind (?<!dark:) and lookahead to ensure we don't match bg-paper/50
  content = content.replace(/(?<!dark:)bg-paper(?=[ "'\n]|$)/g, 'bg-paper dark:bg-ink-card');
  content = content.replace(/(?<!dark:)text-ink(?=[ "'\n]|$)/g, 'text-ink dark:text-paper');
  content = content.replace(/(?<!dark:)border-ink\/10(?=[ "'\n]|$)/g, 'border-ink/10 dark:border-paper/10');
  content = content.replace(/(?<!dark:)border-ink\/20(?=[ "'\n]|$)/g, 'border-ink/20 dark:border-paper/20');
  content = content.replace(/(?<!dark:)shadow-paper(?=[ "'\n]|$)/g, 'shadow-paper dark:shadow-none');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated classes in ' + file);
  }
});
