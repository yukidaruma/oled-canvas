[oled-js](https://github.com/noopkat/oled-js) (and compatible libraries) with [node-canvas](https://github.com/Automattic/node-canvas)

# Installation
1. [Install node-canvas' dependencies](https://github.com/Automattic/node-canvas#installation)
2. Install dependencies then npm install

   ```
   # dependencies
   npm install oled # for Arduino
   npm install oled-i2c-bus # for Raspberry Pi

   npm install https://github.com/yukidaruma/oled-canvas
   ```

# Example
## Initialization
```javascript
// for Arduino
const Oled = require('oled');
const OledCanvas = require('oled-canvas')(Oled);
const five = require('johnny-five');
const board = new five.Board();

const oled = new OledCanvas(five, board, {
  width: 128,
  height: 64,
  address: 0x3D,
  // default font is system monospace
  // alternatively, you can use any font
  // fontFile: './path/to/OpenSans.ttf',
});

// for Raspberry Pi
const i2c = require('i2c-bus');
const i2cBus = i2c.openSync(1);
const Oled = require('oled-i2c-bus');
const OledCanvas = require('oled-canvas')(Oled);

const oled = new OledCanvas(i2cBus, {
  width: 128,
  height: 64,
  address: 0x3C,
  // By default, oled-canvas tries to use system monospace font.
  // Alternatively, you can specify any font.
  // fontFile: './path/to/OpenSans.ttf',
});
```

## Usage
```javascript
// Set update=false so oled-canvas update only once on drawString.
// (update is very costly function)
oled.clearDisplay({ update: false });
oled.fillRect(30, 40, 20, 20, { color: '#000', update: false });

const fontSize = 12;
oled.drawString('こんにちは、世界', { fontSize });

// You can access canvas context if necessary.
const ctx = oled.getContext();
ctx.getImageData(0, 0, oled.WIDTH, oled.HEIGHT);
```

# Why Canvas?
- Non-monospace and CJK font support
- Powerful built-in functions
- Future color support
- Prototyping/development without actually using OLED display.

# License
MIT
