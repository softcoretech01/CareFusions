import re

FILE_PATH = "main.py"
with open(FILE_PATH, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('prefix=\\"/api/v1\\"', 'prefix="/api/v1"')

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed syntax error in main.py")
