import re
path = r'd:\HMS\CareFusions\Python\app\routers\medicine.py'
with open(path, 'r', encoding='utf-8') as f: text = f.read()

# Add p_Manufacturer to params dict
text = text.replace('"p_SubCategory":    safe_value(kwargs.get("sub_category")),',
                    '"p_SubCategory":    safe_value(kwargs.get("sub_category")),\n        "p_Manufacturer":   safe_value(kwargs.get("manufacturer")),')

# Add :p_Manufacturer to CALL string
text = text.replace(':p_MedicineCode, :p_GenericName, :p_Category, :p_SubCategory,',
                    ':p_MedicineCode, :p_GenericName, :p_Category, :p_SubCategory, :p_Manufacturer,')

with open(path, 'w', encoding='utf-8') as f: f.write(text)
