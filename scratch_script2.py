import os, re
dir_path = os.path.join(r'd:\HMS\CareFusions\frontend\src\layouts')
for filename in os.listdir(dir_path):
    if filename.endswith('.tsx'):
        filepath = os.path.join(dir_path, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Regex to match the block:
        # <div className="hidden md:block shrink-0"> ... {greeting} ... {name} ... </div>
        # or anything similar. We can just replace the block containing greeting.
        # Let's match from <div className="hidden md:block shrink-0"> up to the first </div> that contains {greeting}
        new_content = re.sub(
            r'<div className=\"hidden md:block shrink-0\">\s*<p[^>]*>\{greeting\}<\/p>\s*<p[^>]*>\{name\}<\/p>\s*<\/div>',
            '<div className=\"hidden md:block shrink-0\"></div>',
            content
        )
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print('Updated', filename)
