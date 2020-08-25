import sys
import time
import RPi.GPIO as GPIO

# disable warnings
GPIO.setwarnings(False)

# use Pi BCM mode for pin numbers
GPIO.setmode(GPIO.BCM)

# hall effect pins
channel1 =  19
channel2 =  26

# sensor power pin
powerPin =  13
inputPins  = [channel1, channel2]

# set input state and pull up resistor on input pins so the values don't float
GPIO.setup(inputPins, GPIO.IN, pull_up_down=GPIO.PUD_UP)


GPIO.setup(powerPin, GPIO.OUT)

# power up sensors via sensor pin (Pi can source ~10mA per io pin -- should be more than enough for hall application)
GPIO.output(powerPin, GPIO.HIGH)

# zero counter global
counter = 0

DEBOUNCE_TIME_MS = 1

# simplifed string values of sensor states "[channel1],[channel2]"
COUNT_STATE = "1,1"
FORWARD_STATE = "0,1"
BACKWARD_STATE = "1,0"

COUNT_BACKWARDS  = False


COUNTER_OUTPUT_PATH = "ram/counter.txt"

previousState = ""

# state change handler
def stateChange(channel):
        global previousState, counter
        channel2State = GPIO.input(channel1)
        channel1State = GPIO.input(channel2)

        # create sensor state string
        currentState = str(channel1State) +  "," +  str(channel2State)


        # compare current sensor state to previous to determine wheel rotation direction
        if previousState == "":
                previousState = currentState
        elif  currentState  == COUNT_STATE:
                if previousState == FORWARD_STATE:
                        counter += 1
                elif previousState  ==  BACKWARD_STATE and COUNT_BACKWARDS:
                        counter -= 1

                previousState = ""

                with open(COUNTER_OUTPUT_PATH, 'w') as fileOut:
                        fileOut.write(str(counter))
		

# debounced state change events from hall effect sensor input pins 
GPIO.add_event_detect(channel1, GPIO.RISING, callback=stateChange, bouncetime=DEBOUNCE_TIME_MS)
GPIO.add_event_detect(channel2, GPIO.RISING, callback=stateChange, bouncetime=DEBOUNCE_TIME_MS)

print "starting wheel counter"

# run code
while True:
	time.sleep(1)
