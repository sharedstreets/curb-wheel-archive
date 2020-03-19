import gpiozero
from signal import pause
from datetime import datetime
from decimal import Decimal

# Returns a datetime object
dateTimeObj = datetime.now(tz=None)
print("started at " + str(dateTimeObj))

# Defines GPIO pins for buttons on wheel handle. These handle default to high voltage, drops when button pressed. Only the clear button is currently in use.
mft = gpiozero.DigitalInputDevice(16, pull_up=True)
sm = gpiozero.DigitalInputDevice(26, pull_up=True)
# rm = gpiozero.DigitalInputDevice(20, pull_up=True)
clear = gpiozero.DigitalInputDevice(21, pull_up=True)
power = gpiozero.DigitalInputDevice(19, pull_up=True)

# Sets up measurement unit conversions
units = "m"
unit_multiplier = 1

# Note: This script doesn't track the state of the wheel's display (on/off) bc we don't know whether it's on or off when the counting script starts. That means it will still log measurements when the wheel is spinning but the display is off, though turning the wheel on will clear the current measurement back to zero.

# Defines Hall Effect sensor pins and calculates distance. The Hall Effect sensors default to high, when magnet passes they drop to low.
green = gpiozero.DigitalInputDevice(18, pull_up=True)
yellow  = gpiozero.DigitalInputDevice(17, pull_up=True)
distance_decimetres = 0
previous_yellow = yellow.value
previous_green = green.value

def update_distance_metres():
    global distance_decimetres
    global units
    global unit_multiplier

    if yellow.value == 0:
        distance_decimetres = distance_decimetres + 1
    elif yellow.value == 1:
        distance_decimetres = distance_decimetres - 1
    if distance_decimetres <= 0:
        distance_decimetres = 0
    print(str(Decimal(distance_decimetres/10*unit_multiplier).quantize(Decimal("1e-1"))) + " " + units + ", " + str(datetime.now(tz=None)))

green.when_deactivated = update_distance_metres

# Clear and power buttons reset counter to 0
def clear_distance():
    global distance_decimetres
    global units
    global unit_multiplier

    distance_decimetres = 0
    
    print(str(Decimal(distance_decimetres/10*unit_multiplier).quantize(Decimal("1e-1"))) + " " + units + ", " + str(datetime.now(tz=None)))

clear.when_deactivated = clear_distance
power.when_deactivated = clear_distance

# SM button logs a measurement
def log_measurement():
    global distance_decimetres
    global units
    global unit_multiplier

    if sm.value == 0:
        print("log measurement " + str(Decimal(distance_decimetres/10*unit_multiplier).quantize(Decimal("1e-1"))) + " " + units + ", " + str(datetime.now(tz=None)))

sm.when_deactivated = log_measurement

# Switch between metres and feet to stay in sync with the device

def switch_units():
        global units
        global unit_multiplier

        if units == "m":
                units = "ft"
                unit_multiplier = 3.28084
        elif units == "ft":
                units = "m"
                unit_multiplier = 1
        print(str(Decimal(distance_decimetres/10*unit_multiplier).quantize(Decimal("1e-1"))) + " " + units + ", " + str(datetime.now(tz=None)))

mft.when_deactivated = switch_units

pause()
