import os
import time

def watch_log():
    log_file = "error_log.txt"
    if not os.path.exists(log_file):
        print("Log file doesn't exist.")
        return
    
    with open(log_file, "r") as f:
        # Go to end
        f.seek(0, 2)
        print("Watching for new errors...")
        while True:
            line = f.readline()
            if not line:
                time.sleep(1)
                continue
            print(line, end="")

if __name__ == "__main__":
    watch_log()
