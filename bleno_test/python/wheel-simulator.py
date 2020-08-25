import sys
import time
import random
import decimal

COUNTER_OUTPUT_PATH = "ram/counter.txt"

counter = 0

# state change handler
def incrementCounter():
        global counter
        counter += decimal.Decimal(random.randrange(1, 10))
        with open(COUNTER_OUTPUT_PATH, 'w') as fileOut:
                fileOut.write(str(counter))

print "starting wheel counter simulator"

# run code
while True:
	time.sleep(1)
        incrementCounter()
