import os
import re

dir_path = r"d:\Care Fusions\CareFusions\frontend\src\layouts"

def remove_blocks(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    original = content
    
    # Remove the cycleTheme button completely
    # It usually starts with <button and contains cycleTheme or Theme: or Sun/Moon/Monitor
    # Let's match `<button ... onClick={cycleTheme} ... </button>`
    content = re.sub(
        r'<button[^>]*onClick=\{cycleTheme\}[^>]*>[\s\S]*?</button>\s*',
        '',
        content
    )
    
    # Also remove any Bell button
    content = re.sub(
        r'<button[^>]*>\s*<Bell\b[\s\S]*?</button>\s*',
        '',
        content
    )
    
    # Also remove Settings button if it is there
    content = re.sub(
        r'<button[^>]*>\s*<Settings\b[\s\S]*?</button>\s*',
        '',
        content
    )

    if original != content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {os.path.basename(file_path)}")

for filename in os.listdir(dir_path):
    if filename.endswith(".tsx"):
        remove_blocks(os.path.join(dir_path, filename))
