import os
import re

FRONTEND_DIR = r"d:\Care Fusions\CareFusions\frontend\src"

def refactor_sidebars():
    layouts_dir = os.path.join(FRONTEND_DIR, "layouts")
    for root, _, files in os.walk(layouts_dir):
        for file in files:
            if file.endswith("Sidebar.tsx") and file != "Sidebar.tsx":
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Replace the active background logic for sidebars to match Admin sidebar style
                # Original example:
                # isActive ? 'bg-primary/15 text-primary font-semibold' : 'hover:bg-white/5 hover:text-white text-white/80'
                # or similar things.
                
                # We will just regex replace the string block inside className={({ isActive }) => ... }
                
                # Finding the class string block inside backticks
                pattern = r"className=\{\(\{ isActive \}\) =>\s*`([^`]+)`\s*\}"
                
                def replace_class(match):
                    original = match.group(1)
                    # Create the new template string content
                    # We will replace whatever the condition was with the new one
                    if "isActive" in original:
                        new_content = r"flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-white/20 text-secondary font-bold shadow-sm' : 'hover:bg-white/5 hover:text-white text-white/80'}"
                        return f"className={{({{ isActive }}) => `{new_content}`}}"
                    return match.group(0)

                content = re.sub(pattern, replace_class, content)

                # Replace icon coloring inside NavLink to use text-secondary for active state
                icon_pattern = r"className=\{\`[^\`]*\$\{isActive \? '[^']+' : '([^']+)'\}\`\}"
                
                def replace_icon(match):
                    inactive_part = match.group(1)
                    if "group-hover:text" in inactive_part:
                        return f"className={{`w-5 h-5 transition-colors ${{isActive ? 'text-secondary' : 'text-white/60 group-hover:text-secondary'}}`}}"
                    return match.group(0)

                content = re.sub(icon_pattern, replace_icon, content)

                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)

def refactor_date_filters():
    pages_dir = os.path.join(FRONTEND_DIR, "pages")
    import_date_filter = "import { DateFilter } from '../../components/ui/DateFilter';\n"
    
    for root, _, files in os.walk(pages_dir):
        for file in files:
            if file.endswith(".tsx"):
                filepath = os.path.join(root, file)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                if "type=\"date\"" in content:
                    # Very hacky manual replacements. I'll just rely on TS to tell me what I broke, but let's try to not break anything.
                    # This script is a bit dangerous, so let me just do a simpler replacement or use python re.
                    pass

if __name__ == "__main__":
    refactor_sidebars()
    print("Done")
