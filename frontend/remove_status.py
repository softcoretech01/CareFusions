import re
import os

files = [
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\VendorMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\CategoryMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\SubCategoryMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\UomMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\pharmacy-masters\MedicineMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\ItemMaster.tsx",
    r"d:\HMS\CareFusions\frontend\src\pages\admin\purchase-inventory\WarehouseMaster.tsx"
]

for file_path in files:
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Remove th for Status
        content = re.sub(r'<th[^>]*>\s*Status\s*</th>\s*', '', content)
        
        # Remove td containing record.status
        content = re.sub(r'<td[^>]*>\s*<span[^>]*record\.status[^>]*>[\s\S]*?</span>\s*</td>\s*', '', content)
        
        # Remove edit field div
        content = re.sub(r'<div(?:[^>]*?)>\s*<label[^>]*>\s*Status\s*</label>\s*<select[^>]*value=\{formData\.status\}[\s\S]*?</select>\s*</div>\s*', '', content)
        
        # Remove view field div (span based)
        content = re.sub(r'<div(?:[^>]*?)>\s*<span[^>]*>\s*Status\s*</span>\s*<span[^>]*selectedRecord\.status[^>]*>[\s\S]*?</span>\s*</div>\s*', '', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Processed {file_path}")
    except Exception as e:
        print(f"Failed on {file_path}: {e}")
