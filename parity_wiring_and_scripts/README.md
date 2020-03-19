## Parity approach

Below are wiring diagrams for the curb wheel's test phase, where we send all signals to both the Raspberry Pi and the original wheel's board and display. The purpose of this is to keep parity between the board so we can tell if measurements are being miscounted. materials needed are a Raspberry Pi Zero W with GPIO pins soldered on, a JST connector, a handful of male-to-female jumper cables, and a strip of header pins (cut to size).

The protoboard is wired like this:
![](https://github.com/sharedstreets/curb-wheel/blob/master/parity_wiring_and_scripts/gpio.png)

The Raspberry Pi GPIO pins are wired like this:
![](https://github.com/sharedstreets/curb-wheel/blob/master/parity_wiring_and_scripts/gpio.png)

With this configuration, the wheel uses the [counter.py](https://github.com/sharedstreets/curb-wheel/blob/master/parity_wiring_and_scripts/counter.py) script to interpret the signals from the sensors and buttons. The timestamp included is a placeholder for that and other data that will come out of the API running on the Pi.
