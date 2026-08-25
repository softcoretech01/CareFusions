import os

def create_master(source_path, target_path, kind):
    with open(source_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Base replacements
    # 1. API Endpoint
    content = content.replace('/procedures/', f'/{kind}-operations/')
    content = content.replace('/procedures', f'/{kind}-operations')
    
    # 2. Interface Name
    content = content.replace('ProcedureRecord', f'{kind.capitalize()}OperationRecord')
    
    # 3. Component Name
    content = content.replace('ProcedureMaster', f'{kind.capitalize()}OperationMaster')
    
    # 4. State mapping API
    # the schema for operation has operationCode instead of procedureCode
    content = content.replace('procedureCode:', 'operationCode:')
    content = content.replace('item.procedureCode', 'item.operationCode')
    content = content.replace('procedureName:', 'operationName:')
    content = content.replace('item.procedureName', 'item.operationName')
    
    # 5. Form field usages
    content = content.replace('formData.procedureCode', 'formData.operationCode')
    content = content.replace('formData.procedureName', 'formData.operationName')
    content = content.replace('record.procedureCode', 'record.operationCode')
    content = content.replace('record.procedureName', 'record.operationName')
    content = content.replace('errors.procedureCode', 'errors.operationCode')
    content = content.replace('errors.procedureName', 'errors.operationName')
    
    # Remove procedureType dependencies (as Operations might not have a type drop down)
    content = content.replace('procedureType: string;', '')
    content = content.replace('procedureType: \'\',', '')
    content = content.replace('procedureType:     item.procedureType,', '')
    content = content.replace('procedureType:     formData.procedureType,', '')
    content = content.replace("if (!formData.procedureType) newErrors.procedureType = 'Procedure Type is required';", '')
    content = content.replace("const [procedureTypesList, setProcedureTypesList] = useState<{typeName: string}[]>([]);", '')
    content = content.replace("fetch(`${API_BASE}/procedure-types/`)", '')
    content = content.replace("const [dRes, ptRes] = await Promise.all([", "const [dRes] = await Promise.all([")
    content = content.replace("if (ptRes.ok) setProcedureTypesList(await ptRes.json());", "")
    content = content.replace("const matchesType = !filterType || record.procedureType === filterType;", "const matchesType = true;")
    
    # Drop down in UI for procedure type - we'll just let it fail to render and fix with regex or replace
    import re
    # Remove the whole select block for procedureType
    content = re.sub(r'<div>\s*<label.*?Procedure Type.*?</select>\s*\{errors\.procedureType.*?</p>\}\s*</div>', '', content, flags=re.DOTALL)
    
    content = re.sub(r'<select\s+value=\{filterType\}.*?</select>', '', content, flags=re.DOTALL)
    
    content = content.replace('Procedure', f'{kind.capitalize()} Operation')
    content = content.replace('procedure', f'{kind} operation')
    content = content.replace('PROC-', 'OP-')
    content = content.replace('PRO-', 'OP-')

    # Remove the table columns related to type
    content = content.replace('<th className="px-4 py-3 font-medium">Procedure Type</th>', '')
    content = content.replace('<td className="px-4 py-3 text-slate-600">{record.procedureType}</td>', '')
    content = content.replace('setFilterType(\'\');', '')

    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)

src = r"d:\project\CareFusions\frontend\src\pages\admin\patient-masters\ProcedureMaster.tsx"

create_master(src, r"d:\project\CareFusions\frontend\src\pages\admin\operation-masters\MinorOperationMaster.tsx", "minor")
create_master(src, r"d:\project\CareFusions\frontend\src\pages\admin\operation-masters\MajorOperationMaster.tsx", "major")
