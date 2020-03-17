import gpiozero
from signal import pause


print("i have started!")

# Defines GPIO pins for buttons on wheel handle. These handle default to high voltage, drops when button pressed. Only the clear button is currently in use.
# mft = gpiozero.DigitalInputDevice(16, pull_up=True)
# sm = gpiozero.DigitalInputDevice(26, pull_up=True)
# rm = gpiozero.DigitalInputDevice(20, pull_up=True)
clear = gpiozero.DigitalInputDevice(21, pull_up=True)
power = gpiozero.DigitalInputDevice(19, pull_up=True)

# Defines Hall Effect sensor pins and calculates distance. The Hall Effect sensors default to high, when magnet passes they drop to low.
green = gpiozero.DigitalInputDevice(18, pull_up=True)
yellow  = gpiozero.DigitalInputDevice(17, pull_up=True)
distance_decimetres = 0
previous_yellow = yellow.value
previous_green = green.value

def update_distance_metres():
    global distance_decimetres
    if yellow.value == 0:
        distance_decimetres = distance_decimetres + 1
    elif yellow.value == 1:
        distance_decimetres = distance_decimetres - 1
    if distance_decimetres <= 0:
        distance_decimetres = 0
    print(distance_decimetres/10)

green.when_deactivated = update_distance_metres

# Clear button resets counter to 0
def clear_distance():
    global distance_decimetres
    
    if clear.value == 0:
        distance_decimetres = 0
    elif power.value == 0:
        distance_decimetres = 0
    print(distance_decimetres/10)

clear.when_deactivated = clear_distance

pause()
