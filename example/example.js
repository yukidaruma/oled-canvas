const i2c = require('i2c-bus');
const i2cBus = i2c.openSync(1);
const Oled = require('oled-i2c-bus');
const OledCanvas = require('oled-canvas')(Oled);

const oled = new OledCanvas(i2cBus, {
  width: 128,
  height: 64,
  address: 0x3C,
  fontFile: './PixelMplus12-Regular.ttf',
});

oled.clearDisplay();
oled.writeString('abcあいう', 12);
