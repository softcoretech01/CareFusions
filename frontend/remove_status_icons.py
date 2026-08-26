import re
import os

files = [
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\VendorMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\CategoryMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\SubCategoryMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\UomMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\pharmacy-masters\MedicineMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\ItemMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\WarehouseMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\BrandMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\ManufacturerMaster.tsx"
]

for file_path in files:
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Remove the handleToggleStatus button
        content = re.sub(r'<button[^>]*onClick=\{[^}]*handleToggleStatus[\s\S]*?</button>\s*', '', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Processed {file_path}")
    except Exception as e:
        print(f"Failed on {file_path}: {e}")
