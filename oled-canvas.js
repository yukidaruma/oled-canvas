const Canvas = require('canvas');

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
        Canvas.registerFont(opts.fontFile, { family: fontFamily });
      } else {
        this.font = 'monospace';
      }

      const canvas = new Canvas(this.WIDTH, this.HEIGHT);
      this._ctx = canvas.getContext('2d');
      this.clearCanvas();
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
      this.fillRect(0, 0, this.WIDTH, this.HEIGHT, '#fff', false);
    }

    clearDisplay(update = true) {
      this.clearCanvas();
      if (update) this.update();
    }

    drawLine(x0, y0, x1, y1, color = '#000', update = true) {
      const ctx = this._ctx;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      if (update) this.update();
    }

    drawPixel(pixels, update) {
      const ctx = this._ctx;

      if (!Array.isArray(pixels[0])) pixels = [pixels];

      pixels.forEach((elem) => {
        const [x, y, pixel] = elem;
        this.fillRect(x, y, 1, 1, pixel ? '#000' : 'fff', false);
      });

      if (update) this.update();
    }

    fillRect(x, y, w, h, color = '#000', update = true) {
      const ctx = this._ctx;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);

      if (update) this.update();
    }

    getContext() {
      return this._ctx;
    }

    writeString(string, size, color = '#000', update = true) {
      const ctx = this._ctx;
      ctx.font = `${size}px "${this.fontFamily}"`;
      ctx.textBaseline = 'bottom';

      const width = ctx.measureText(string).width;

      this.fillRect(this.cursor_x, this.cursor_y, width, size, '#fff', update);

      ctx.fillStyle = color;
      ctx.fillText(string, this.cursor_x, this.cursor_y + size);

      if (update) this.update();
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
