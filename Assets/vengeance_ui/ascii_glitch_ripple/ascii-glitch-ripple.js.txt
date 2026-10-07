(function () {
  const DEFAULT_CHARS =
    '.,·-─~+:;=*π""┐┌┘┴┬╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&#$@0123456789*';

  const WAVE_THRESH = 3;
  const CHAR_MULT = 3;
  const ANIM_STEP = 40;
  const WAVE_BUF = 5;

  class AsciiGlitchRipple {
    constructor(el, options = {}) {
      if (!el) throw new Error("AsciiGlitchRipple requires an element.");

      this.el = el;
      this.origTxt = options.text ?? el.textContent ?? "";
      this.origChars = this.origTxt.split("");

      this.dur = Number(options.dur ?? el.dataset.dur ?? 1000);
      this.chars = options.chars ?? el.dataset.chars ?? DEFAULT_CHARS;
      this.preserveSpaces =
        options.preserveSpaces ??
        el.dataset.preserveSpaces !== "false";

      this.spread = Number(options.spread ?? el.dataset.spread ?? 1.0);

      this.isAnim = false;
      this.isHover = false;
      this.cursorPos = 0;
      this.waves = [];
      this.animId = null;
      this.origW = null;

      this.el.textContent = this.origTxt;
      this.el.classList.add("ascii-glitch-ripple");

      this.handleEnter = this.handleEnter.bind(this);
      this.handleMove = this.handleMove.bind(this);
      this.handleLeave = this.handleLeave.bind(this);
      this.animate = this.animate.bind(this);

      this.bind();
    }

    bind() {
      this.el.addEventListener("mouseenter", this.handleEnter);
      this.el.addEventListener("mousemove", this.handleMove);
      this.el.addEventListener("mouseleave", this.handleLeave);
    }

    destroy() {
      this.el.removeEventListener("mouseenter", this.handleEnter);
      this.el.removeEventListener("mousemove", this.handleMove);
      this.el.removeEventListener("mouseleave", this.handleLeave);

      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }

      this.stop();
      this.el.classList.remove("ascii-glitch-ripple");
    }

    refresh(newText) {
      this.origTxt = newText ?? this.el.textContent ?? "";
      this.origChars = this.origTxt.split("");
      this.el.textContent = this.origTxt;
      this.resetWidth();
    }

    updateCursorPos(e) {
      const rect = this.el.getBoundingClientRect();
      const len = this.origTxt.length;

      if (!rect.width || len === 0) {
        this.cursorPos = 0;
        return;
      }

      const x = e.clientX - rect.left;
      const pos = Math.round((x / rect.width) * len);

      this.cursorPos = Math.max(0, Math.min(pos, len - 1));
    }

    lockWidth() {
      if (this.origW === null) {
        this.origW = this.el.getBoundingClientRect().width;
        this.el.style.width = `${this.origW}px`;
      }
    }

    resetWidth() {
      this.el.style.width = "";
      this.origW = null;
    }

    startWave() {
      if (!this.origTxt.length) return;

      this.waves.push({
        startPos: this.cursorPos,
        startTime: Date.now(),
        id: Math.random(),
      });

      if (!this.isAnim) this.start();
    }

    start() {
      if (this.isAnim) return;

      this.lockWidth();
      this.isAnim = true;
      this.el.classList.add("is-ascii-glitching");

      this.animId = requestAnimationFrame(this.animate);
    }

    stop() {
      this.el.textContent = this.origTxt;
      this.el.classList.remove("is-ascii-glitching");
      this.resetWidth();

      this.isAnim = false;
      this.waves = [];

      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    animate() {
      const t = Date.now();

      this.waves = this.waves.filter((w) => t - w.startTime < this.dur);

      if (this.waves.length === 0) {
        this.stop();
        return;
      }

      this.el.textContent = this.generateScrambledText(t);
      this.animId = requestAnimationFrame(this.animate);
    }

    calcWaveEffect(charIdx, t) {
      let shouldAnim = false;
      let resultChar = this.origChars[charIdx];

      for (const w of this.waves) {
        const age = t - w.startTime;
        const prog = Math.min(age / this.dur, 1);
        const dist = Math.abs(charIdx - w.startPos);
        const maxDist = Math.max(
          w.startPos,
          this.origChars.length - w.startPos - 1
        );

        const rad = (prog * (maxDist + WAVE_BUF)) / this.spread;

        if (dist <= rad) {
          shouldAnim = true;

          const intens = Math.max(0, rad - dist);

          if (intens <= WAVE_THRESH && intens > 0) {
            const index =
              (dist * CHAR_MULT + Math.floor(age / ANIM_STEP)) %
              this.chars.length;

            resultChar = this.chars[index];
          }
        }
      }

      return shouldAnim ? resultChar : this.origChars[charIdx];
    }

    generateScrambledText(t) {
      return this.origChars
        .map((char, i) => {
          if (this.preserveSpaces && char === " ") return " ";
          return this.calcWaveEffect(i, t);
        })
        .join("");
    }

    handleEnter(e) {
      this.isHover = true;
      this.updateCursorPos(e);
      this.startWave();
    }

    handleMove(e) {
      if (!this.isHover) return;

      const old = this.cursorPos;
      this.updateCursorPos(e);

      if (this.cursorPos !== old) {
        this.startWave();
      }
    }

    handleLeave() {
      this.isHover = false;
    }
  }

  window.AsciiGlitchRipple = AsciiGlitchRipple;

  window.initAsciiGlitchRipples = function (selector = "[data-ascii-glitch]") {
    const instances = [];

    document.querySelectorAll(selector).forEach((el) => {
      if (el.__asciiGlitchRipple) return;

      const instance = new AsciiGlitchRipple(el);
      el.__asciiGlitchRipple = instance;
      instances.push(instance);
    });

    return instances;
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.initAsciiGlitchRipples();
  });
})();