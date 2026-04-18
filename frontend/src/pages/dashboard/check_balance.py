import sys
import re

def check_jsx_balance(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    RELEVANT_TAGS = {'div', 'section', 'motion.div', 'AnimatePresence', 'DashboardLayout', 'ModernModal', 'CustomDropdown'}
    open_stack = []
    tags = re.finditer(r'<([a-zA-Z0-9\.]+)([^>]*?)(/?)>|</([a-zA-Z0-9\.]+)>', content)
    
    for match in tags:
        groups = match.groups()
        start_idx = match.start()
        line_num = content.count('\n', 0, start_idx) + 1
        
        if groups[0]: # Opening tag
            name = groups[0]
            if name in RELEVANT_TAGS:
                is_self_closing = groups[2] == '/'
                if not is_self_closing:
                    open_stack.append((name, line_num))
                    print(f"Open <{name}> at line {line_num}. Stack size: {len(open_stack)}")
        elif groups[3]: # Closing tag
            name = groups[3]
            if name in RELEVANT_TAGS:
                if not open_stack:
                    print(f"ERROR: Unexpected </{name}> at line {line_num}")
                else:
                    last_name, last_line = open_stack.pop()
                    print(f"Close </{name}> at line {line_num} (matches <{last_name}> from line {last_line}). Stack size: {len(open_stack)}")
                    if last_name != name:
                        print(f"!!! MISMATCH !!! Expected </{last_name}> but found </{name}> at line {line_num}")

    print("\nFinal Remaining Stack:")
    for name, line in open_stack:
        print(f"<{name}> at line {line}")

if __name__ == "__main__":
    check_jsx_balance(sys.argv[1])
