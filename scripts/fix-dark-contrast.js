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

  // Find all instances of text-ink with optional opacity and add dark equivalent, ensuring not already dark prefixed.
  content = content.replace(/(?<!dark:)text-ink(\/\d+)?(?=[ "'\n]|$)/g, (match, opac) => {
    return `${match} dark:text-paper${opac || ''}`;
  });

  // Border-ink with optional opacity
  content = content.replace(/(?<!dark:)border-ink(\/\d+)?(?=[ "'\n]|$)/g, (match, opac) => {
    return `${match} dark:border-paper${opac || ''}`;
  });

  // bg-paper with optional opacity
  content = content.replace(/(?<!dark:)bg-paper(\/\d+)?(?=[ "'\n]|$)/g, (match, opac) => {
    return `${match} dark:bg-ink-card${opac || ''}`;
  });

  // border-paper with optional opacity (for dark mode we want border-ink-card maybe? No, let's leave it unless needed)

  // Wait, if it already had a dark equivalent added by the previous script (e.g. text-ink dark:text-paper), the regex `(?<!dark:)text-ink` will match `text-ink` and replace it with `text-ink dark:text-paper`, resulting in `text-ink dark:text-paper dark:text-paper`.
  // To fix this, we can first remove existing simple dark classes that we added, or use a negative lookahead to ensure it isn't followed immediately by its dark equivalent.
  // We can just run a cleanup pass if needed.
  
  // Cleanup pass to remove duplicate dark variants
  content = content.replace(/dark:text-paper(\/\d+)?(\s+)dark:text-paper\1/g, 'dark:text-paper$1$2');
  content = content.replace(/dark:text-paper(\s+)dark:text-paper/g, 'dark:text-paper');
  content = content.replace(/dark:border-paper(\/\d+)?(\s+)dark:border-paper\1/g, 'dark:border-paper$1$2');
  content = content.replace(/dark:border-paper(\s+)dark:border-paper/g, 'dark:border-paper');
  content = content.replace(/dark:bg-ink-card(\/\d+)?(\s+)dark:bg-ink-card\1/g, 'dark:bg-ink-card$1$2');
  content = content.replace(/dark:bg-ink-card(\s+)dark:bg-ink-card/g, 'dark:bg-ink-card');
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed contrast classes in ' + file);
  }
});
