import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, 'src', 'pages', 'registration');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let updatedCount = 0;

walkDir(targetDir, (filePath) => {
  if (!filePath.endsWith('.tsx')) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  let componentName = path.basename(filePath, '.tsx');

  const relativePath = path.relative(path.join(__dirname, 'src', 'pages', 'registration'), filePath);
  const depth = relativePath.split(path.sep).length; 
  let importPrefix = '../'.repeat(depth + 1);
  const actualImport = `import { exportToExcel } from '${importPrefix}utils/exportToExcel';\n`;

  let needsImport = false;

  // We export `patients` or `records` based on what exists, but since we know Registration portal uses `patients` or `records`, let's just use `patients` if `usePatients` is imported, else `records`.
  // Actually, some files have `patients`, some have `records`. Let's just use `patients` if `content.includes('const { patients')` else `records`.
  const exportVar = content.includes('const { patients') || content.includes('patients.') ? 'patients' : 'records';

  const pattern1 = /<Button variant="outline" icon=\{Download\}>Export<\/Button>/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, `<Button variant="outline" icon={Download} onClick={() => exportToExcel(${exportVar}, '${componentName}')}>Export</Button>`);
    needsImport = true;
  }

  const pattern2 = /<Button variant="outline" icon=\{Download\}>Export List<\/Button>/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, `<Button variant="outline" icon={Download} onClick={() => exportToExcel(${exportVar}, '${componentName}')}>Export List</Button>`);
    needsImport = true;
  }

  const pattern3 = /<button className="([^"]*)"(?: onClick=\{[^}]*\})?>\s*<Download className="w-[45] h-[45]" \/>(?:\s*Export)?\s*<\/button>/g;
  if (pattern3.test(content)) {
    content = content.replace(pattern3, `<button className="$1" onClick={() => exportToExcel(${exportVar}, '${componentName}')}>\n                  <Download className="w-5 h-5" />\n                  Export\n                </button>`);
    needsImport = true;
  }

  if (content.includes('exportToExcel') && !originalContent.includes('import { exportToExcel }')) {
     needsImport = true;
  }

  if (needsImport) {
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLastImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLastImport + 1) + actualImport + content.slice(endOfLastImport + 1);
    } else {
      content = actualImport + content;
    }
  }

  // Fix duplicate imports
  const lines = content.split('\n');
  const uniqueLines = [];
  let seenImport = false;
  for (const line of lines) {
    if (line.includes('import { exportToExcel }')) {
      if (!seenImport) {
        seenImport = true;
        uniqueLines.push(line);
      }
    } else {
      uniqueLines.push(line);
    }
  }
  content = uniqueLines.join('\n');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    updatedCount++;
    console.log(`Updated ${componentName}`);
  }
});

console.log(`Total registration files updated: ${updatedCount}`);
