const fs = require('fs');
const path = require('path');

const dir = 'd:/Care Fusions/CareFusions/frontend/src';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(dir);
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('Sign Out') && !content.includes('Version 0.01')) {
    const regex = /(Sign Out\s*<\/div>\s*<\/button>)/;
    if (regex.test(content)) {
        content = content.replace(regex, '$1\n        <div className="text-center text-white/40 text-xs mt-2">\n          Version 0.01\n        </div>');
        fs.writeFileSync(file, content);
        count++;
        console.log('Updated', file);
    }
  }
});
console.log('Total files updated: ' + count);
