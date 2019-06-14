const { createCanvas, registerFont } = require('canvas');

const BLACK = '#000';
const WHITE = '#fff';

module.exports = (Oled) => {
  return class OledCanvas extends Oled {
    constructor(..._args) {
      const args = _args.slice(0, _args.length - 1);
      const opts = _args[_args.length - 1];
      super(...args, opts);

      if (opts.fontFile) {
        // use filename as family name
        const fontFamily = opts.fontFile.replace(/^(.*\/)?\.[a-zA-Z]+$/, '');

        this.fontFamily = fontFamily;
        registerFont(opts.fontFile, { family: fontFamily });
      } else {
        this.font = 'monospace';
      }

      const canvas = createCanvas(this.WIDTH, this.HEIGHT);
      this._ctx = canvas.getContext('2d');
    }

    _canvasPixelToOledPixel(pixel) {
      const threshold = 127;

      // assume pi using little-endian
      const r = pixel & 0xff;
      // const g = pixel >>> 8 & 0xff;
      // const b = pixel >>> 16 & 0xff;
      // const a = pixel >>> 24;

      // assume gray pixel has the same amount of r, g and b
      return r < threshold ? 1 : 0;
    }

    clearCanvas() {
      this.fillRect(0, 0, this.WIDTH, this.HEIGHT, { color: WHITE });
      return this;
    }

    drawLine(x0, y0, x1, y1, { color = BLACK } = {}) {
      const ctx = this._ctx;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      return this;
    }

    drawPixels(pixels) {
      if (!Array.isArray(pixels[0])) pixels = [pixels];

      pixels.forEach((elem) => {
        const [x, y, pixel] = elem;
        this.fillRect(x, y, 1, 1, { color: pixel ? BLACK : WHITE });
      });

      return this;
    }

    fillRect(x, y, w, h, { color = BLACK } = {}) {
      const ctx = this._ctx;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);

      return this;
    }

    getContext() {
      return this._ctx;
    }

    drawString(string, { fontSize, color = BLACK } = {}) {
      if (!Number.isFinite(fontSize) || fontSize < 0) {
        throw new Error('fontSize must be positive number.');
      }

      const ctx = this._ctx;
      ctx.font = `${fontSize}px "${this.fontFamily}"`;
      ctx.textBaseline = 'bottom';

      const width = ctx.measureText(string).width;

      this.fillRect(this.cursor_x, this.cursor_y, width, { fontSize, color: WHITE });

      ctx.fillStyle = color;
      ctx.fillText(string, this.cursor_x, this.cursor_y + fontSize);

      return this;
    }

    update() {
      // wait for oled to be ready
      this._waitUntilReady(function() {
        const ctx = this._ctx;
        const pageHeight = 8;
        const pageLen = this.HEIGHT / pageHeight;

        // set the start and endbyte locations for oled display update
        const displaySeq = [
          this.COLUMN_ADDR,
          this.screenConfig.coloffset,
          this.screenConfig.coloffset + this.WIDTH - 1, // column start and end address
          this.PAGE_ADDR, 0, pageLen - 1 // page start and end address
        ];

        // send intro seq
        displaySeq.forEach((elem) => {
          this._transfer('cmd', elem);
        });

        // send canvas data
        const bitsToByte = (bits) => {
          return bits.reverse()
            .map((i, index) => i ? 2 ** index : 0, 0)
            .reduce((a, b) => a + b, 0);
        };

        for (let page = 0; page < pageLen; page++) {
          const pagePixels = new Uint32Array(ctx.getImageData(0, page * pageHeight, this.WIDTH, pageHeight).data.buffer) // Uint8Array to Uint32Array
            .map(this._canvasPixelToOledPixel);

          for (let i = 0; i < this.WIDTH; i++) {
            this._transfer('data', bitsToByte([
              pagePixels[1024 + i],
              pagePixels[896 + i],
              pagePixels[768 + i],
              pagePixels[640 + i],
              pagePixels[512 + i],
              pagePixels[384 + i],
              pagePixels[256 + i],
              pagePixels[128 + i],
              pagePixels[0 + i],
            ]));
          }
        }
      }.bind(this));
    }
  }
};
