const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages', 'admin', 'purchase-inventory');
const files = [
  'ManufacturerMaster.tsx',
  'PaymentTermsMaster.tsx',
  'SubCategoryMaster.tsx',
  'UomMaster.tsx',
  'VendorMaster.tsx',
  'WarehouseMaster.tsx'
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix unused errors: const [errors, setErrors] = useState...
  content = content.replace(
    'const [errors, setErrors] = useState<Record<string, string>>({});',
    '// eslint-disable-next-line @typescript-eslint/no-unused-vars\n  const [errors, setErrors] = useState<Record<string, string>>({});'
  );

  // Fix sortConfig.key possibly undefined
  content = content.replace(
    /if\s*\(sortConfig\.key\)\s*\{\s*result\.sort\(\(a,\s*b\)\s*=>\s*\{\s*if\s*\(a\[sortConfig\.key!\]\s*<\s*b\[sortConfig\.key!\]\)\s*return\s*sortConfig\.direction\s*===\s*'asc'\s*\?\s*-1\s*:\s*1;\s*if\s*\(a\[sortConfig\.key!\]\s*>\s*b\[sortConfig\.key!\]\)\s*return\s*sortConfig\.direction\s*===\s*'asc'\s*\?\s*1\s*:\s*-1;\s*return\s*0;\s*\}\);\s*\}/g,
    `if (sortConfig.key) {
      const sortKey = sortConfig.key;
      result.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortKey] > b[sortKey]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Patched ${file}`);
});
