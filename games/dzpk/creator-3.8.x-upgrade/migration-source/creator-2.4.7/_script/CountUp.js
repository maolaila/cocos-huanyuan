Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CountUp = undefined;
var exp_CountUp = function () {
  function _ctor(t, e, o) {
    var n = this;
    this.target = t;
    this.endVal = e;
    this.options = o;
    this.version = "2.0.7";
    this.defaults = {
      startVal: 0,
      decimalPlaces: 0,
      duration: 2,
      useEasing: true,
      useGrouping: true,
      smartEasingThreshold: 999,
      smartEasingAmount: 333,
      separator: ",",
      decimal: ".",
      prefix: "",
      suffix: ""
    };
    this.startTime = null;
    this.remaining = 0;
    this.finalEndVal = null;
    this.useEasing = true;
    this.countDown = false;
    this.callback = null;
    this.error = "";
    this.startVal = 0;
    this.duration = 2;
    this.paused = true;
    this.count = function (t) {
      n.startTime || (n.startTime = t);
      var e = t - n.startTime;
      n.remaining = n.duration - e;
      if (n.useEasing) {
        if (n.countDown) {
          n.frameVal = n.startVal - n.easingFn(e, 0, n.startVal - n.endVal, n.duration);
        } else {
          n.frameVal = n.easingFn(e, n.startVal, n.endVal - n.startVal, n.duration);
        }
      } else if (n.countDown) {
        n.frameVal = n.startVal - (n.startVal - n.endVal) * (e / n.duration);
      } else {
        n.frameVal = n.startVal + (n.endVal - n.startVal) * (e / n.duration);
      }
      if (n.countDown) {
        n.frameVal = n.frameVal < n.endVal ? n.endVal : n.frameVal;
      } else {
        n.frameVal = n.frameVal > n.endVal ? n.endVal : n.frameVal;
      }
      n.frameVal = Number(n.frameVal.toFixed(n.options.decimalPlaces));
      n.printValue(n.frameVal);
      if (e < n.duration) {
        n.rAF = requestAnimationFrame(n.count);
      } else if (null !== n.finalEndVal) {
        n.update(n.finalEndVal);
      } else {
        n.callback && n.callback();
      }
    };
    this.formatNumber = function (t) {
      var e;
      var o;
      var i;
      var r;
      var a;
      var c = t < 0 ? "-" : "";
      e = Math.abs(t).toFixed(n.options.decimalPlaces);
      i = (o = (e += "").split("."))[0];
      r = o.length > 1 ? n.options.decimal + o[1] : "";
      if (n.options.useGrouping) {
        a = "";
        var s = 0;
        for (var l = i.length; s < l; ++s) {
          0 !== s && s % 3 == 0 && (a = n.options.separator + a);
          a = i[l - s - 1] + a;
        }
        i = a;
      }
      var p = n.options.numerals || [];
      if (p && p.length) {
        i = i.replace(/[0-9]/g, function (t) {
          return p[+t];
        });
        r = r.replace(/[0-9]/g, function (t) {
          return p[+t];
        });
      }
      return c + n.options.prefix + i + r + n.options.suffix;
    };
    this.easeOutExpo = function (t, e, o, n) {
      return o * (1 - Math.pow(2, -10 * t / n)) * 1024 / 1023 + e;
    };
    this.options = Object.assign(this.defaults, o);
    this.formattingFn = this.options.formattingFn ? this.options.formattingFn : this.formatNumber;
    this.easingFn = this.options.easingFn ? this.options.easingFn : this.easeOutExpo;
    this.endVal = this.validateValue(e);
    var i = Number(this.options.startVal || this.endVal);
    this.startVal = this.validateValue(i);
    this.frameVal = this.startVal;
    var r = this.options.decimalPlaces || 0;
    this.options.decimalPlaces = Math.max(0, r);
    this.resetDuration();
    this.options.separator = String(this.options.separator);
    this.options.useEasing = this.options.useEasing || false;
    this.useEasing = this.options.useEasing;
    "" === this.options.separator && (this.options.useGrouping = false);
    this.el = t;
    if (this.el) {
      this.printValue(this.startVal);
    } else {
      this.error = "[CountUp] target is null or undefined";
    }
  }
  _ctor.prototype.determineDirectionAndSmartEasing = function () {
    var t = this.finalEndVal ? this.finalEndVal : this.endVal;
    this.countDown = this.startVal > t;
    var e = t - this.startVal;
    this.options.smartEasingThreshold = this.options.smartEasingThreshold || 0;
    this.options.smartEasingAmount = this.options.smartEasingAmount || 0;
    if (Math.abs(e) > this.options.smartEasingThreshold) {
      this.finalEndVal = t;
      var o = this.countDown ? 1 : -1;
      this.endVal = t + o * this.options.smartEasingAmount;
      this.duration = this.duration / 2;
    } else {
      this.endVal = t;
      this.finalEndVal = null;
    }
    if (this.finalEndVal) {
      this.useEasing = false;
    } else {
      this.options.useEasing = this.options.useEasing || false;
      this.useEasing = this.options.useEasing;
    }
  };
  _ctor.prototype.start = function (t) {
    if (!this.error) {
      t && (this.callback = t);
      if (this.duration > 0) {
        this.determineDirectionAndSmartEasing();
        this.paused = false;
        this.rAF = requestAnimationFrame(this.count);
      } else {
        this.printValue(this.endVal);
      }
    }
  };
  _ctor.prototype.pauseResume = function () {
    if (this.paused) {
      this.startTime = null;
      this.duration = this.remaining;
      this.startVal = this.frameVal;
      this.determineDirectionAndSmartEasing();
      this.rAF = requestAnimationFrame(this.count);
    } else {
      cancelAnimationFrame(this.rAF);
    }
    this.paused = !this.paused;
  };
  _ctor.prototype.reset = function () {
    cancelAnimationFrame(this.rAF);
    this.paused = true;
    this.resetDuration();
    var t = Number(this.options.startVal || this.endVal);
    this.startVal = this.validateValue(t);
    this.frameVal = this.startVal;
    this.printValue(this.startVal);
  };
  _ctor.prototype.update = function (t) {
    cancelAnimationFrame(this.rAF);
    this.startTime = null;
    this.endVal = this.validateValue(t);
    if (this.endVal !== this.frameVal) {
      this.startVal = this.frameVal;
      this.finalEndVal || this.resetDuration();
      this.finalEndVal = null;
      this.determineDirectionAndSmartEasing();
      this.rAF = requestAnimationFrame(this.count);
    }
  };
  _ctor.prototype.printValue = function (t) {
    cc.isValid(this.el, true) && (this.el.string = this.formattingFn(t));
  };
  _ctor.prototype.ensureNumber = function (t) {
    return "number" == typeof t && !isNaN(t);
  };
  _ctor.prototype.validateValue = function (t) {
    var e = Number(t);
    if (this.ensureNumber(e)) {
      return e;
    } else {
      this.error = "[CountUp] invalid start or end value: " + t;
      return 0;
    }
  };
  _ctor.prototype.resetDuration = function () {
    this.startTime = null;
    this.duration = 1e3 * Number(this.options.duration);
    this.remaining = this.duration;
  };
  return _ctor;
}();
exports.CountUp = exp_CountUp;