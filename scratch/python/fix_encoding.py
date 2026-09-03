import re
path = r'd:\HMS\CareFusions\frontend\src\pages\opd\DoctorConsultation.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'\{visit\.date\}\s+[^\x00-\x7F]+\s+\{visit\.doctorName\}', '{visit.date} &middot; {visit.doctorName}', text)
text = re.sub(r'\{visit\.uhid\}\s+[^\x00-\x7F]+\s+\{visit\.age\}y\s+[^\x00-\x7F]+\s+\{visit\.gender\}', '{visit.uhid} &middot; {visit.age}y &middot; {visit.gender}', text)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
