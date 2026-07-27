const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, 'src', 'pages', 'admin', 'purchase-inventory'),
  path.join(__dirname, 'src', 'pages', 'admin', 'billing-masters'),
  path.join(__dirname, 'src', 'pages', 'admin', 'organization-masters')
];

const filesMap = {
  'ManufacturerMaster.tsx': 'src/pages/admin/purchase-inventory/ManufacturerMaster.tsx',
  'PaymentTermsMaster.tsx': 'src/pages/admin/purchase-inventory/PaymentTermsMaster.tsx',
  'SubCategoryMaster.tsx': 'src/pages/admin/purchase-inventory/SubCategoryMaster.tsx',
  'UomMaster.tsx': 'src/pages/admin/purchase-inventory/UomMaster.tsx',
  'VendorMaster.tsx': 'src/pages/admin/purchase-inventory/VendorMaster.tsx',
  'WarehouseMaster.tsx': 'src/pages/admin/purchase-inventory/WarehouseMaster.tsx',
  'CurrencyMaster.tsx': 'src/pages/admin/purchase-inventory/CurrencyMaster.tsx',
  'ItemMaster.tsx': 'src/pages/admin/purchase-inventory/ItemMaster.tsx',
  'BrandMaster.tsx': 'src/pages/admin/purchase-inventory/BrandMaster.tsx',
  'CategoryMaster.tsx': 'src/pages/admin/purchase-inventory/CategoryMaster.tsx',
  'TaxMaster.tsx': 'src/pages/admin/billing-masters/TaxMaster.tsx',
  'DepartmentMaster.tsx': 'src/pages/admin/organization-masters/DepartmentMaster.tsx'
};

Object.entries(filesMap).forEach(([filename, relativePath]) => {
  const filePath = path.join(__dirname, relativePath);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping: ${filePath} (not found)`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace unused errors: const [errors, setErrors] = useState...
  content = content.replace(
    /const\s+\[errors,\s*setErrors\]\s*=\s*useState<Record<string,\s*string>>\(\{\}\);/g,
    '// eslint-disable-next-line @typescript-eslint/no-unused-vars\n  const [errors, setErrors] = useState<Record<string, string>>({});'
  );

  // Replace sorting block
  const regex = /if\s*\(sortConfig\.key\)\s*\{\s*(const\s+sortKey\s*=\s*sortConfig\.key!?;\s*)?result\.sort\(\(a,\s*b\)\s*=>\s*\{\s*if\s*\(a\[(sortKey|sortConfig\.key!)\]\s*<\s*b\[(sortKey|sortConfig\.key!)\]\)\s*return\s*sortConfig\.direction\s*===\s*'asc'\s*\?\s*-1\s*:\s*1;\s*if\s*\(a\[(sortKey|sortConfig\.key!)\]\s*>\s*b\[(sortKey|sortConfig\.key!)\]\)\s*return\s*sortConfig\.direction\s*===\s*'asc'\s*\?\s*1\s*:\s*-1;\s*return\s*0;\s*\}\);\s*\}/g;

  content = content.replace(regex, `if (sortConfig.key) {
      const sortKey = sortConfig.key;
      result.sort((a, b) => {
        const left = a?.[sortKey] as any;
        const right = b?.[sortKey] as any;
        if (left === undefined || right === undefined) return 0;
        if (left < right) return sortConfig.direction === 'asc' ? -1 : 1;
        if (left > right) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Successfully patched ${filename}`);
});
