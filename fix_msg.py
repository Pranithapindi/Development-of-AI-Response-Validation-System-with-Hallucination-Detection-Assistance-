import sys
import re

msg = sys.stdin.read()
# Remove "Milestone N: " prefix
msg = re.sub(r'Milestone \d+:\s*', '', msg)
# Remove "(milestone-N)" from feat(milestone-4)
msg = re.sub(r'\(milestone-\d+\)', '', msg)
print(msg, end='')
