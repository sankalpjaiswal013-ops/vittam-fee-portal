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
      if (full.endsWith('.tsx') && !full.includes('layout') && !full.includes('not-found')) {
        results.push(full);
      }
    }
  });
  return results;
};

const files = walk('./app');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Skip if already imported
  if (!content.includes('ThemeToggle')) {
    // Inject import
    content = content.replace(/(import .*;\n)(?!import)/, `$1import { ThemeToggle } from "@/lib/theme";\n`);
    
    // Inject component in various nav patterns
    if (content.includes('<LangToggle />')) {
      content = content.replace('<LangToggle />', '<div className="flex items-center gap-3"><ThemeToggle /><LangToggle /></div>');
    } 
    else if (content.includes('<Link href="/settings"')) {
      content = content.replace('<Link href="/settings"', '<ThemeToggle />\n          <Link href="/settings"');
    }
    else if (content.includes('<Link\n            href="/pay"')) {
      // For page.tsx
      content = content.replace(/<div className="flex items-center gap-3">\s*<Link\s*href="\/pay"/s, '<div className="flex items-center gap-3">\n          <ThemeToggle />\n          <Link\n            href="/pay"');
    }
    else if (content.includes('nav')) {
      // Fallback
    }

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log('Injected ThemeToggle in ' + file);
    }
  }
});
