(function () {
  var g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : self;
  if (typeof globalThis === 'undefined') { try { Object.defineProperty(g, 'globalThis', { value: g, configurable: true, writable: true }); } catch (e) { g.globalThis = g; } }
  g.__roNative = typeof g.ResizeObserver !== 'undefined';
  function def(proto, name, fn) {
    if (!proto[name]) Object.defineProperty(proto, name, { value: fn, configurable: true, writable: true });
  }
  def(Array.prototype, 'flat', function flat(depth) {
    var d = depth === undefined ? 1 : Number(depth);
    var out = [];
    (function walk(arr, lvl) {
      for (var i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i]) && lvl > 0) walk(arr[i], lvl - 1); else if (i in arr) out.push(arr[i]);
      }
    })(this, d);
    return out;
  });
  def(Array.prototype, 'flatMap', function flatMap(fn, thisArg) { return Array.prototype.map.call(this, fn, thisArg).flat(1); });
  def(Array.prototype, 'at', function at(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return n < 0 || n >= this.length ? undefined : this[n]; });
  def(Array.prototype, 'findLast', function findLast(fn, t) { for (var i = this.length - 1; i >= 0; i--) if (fn.call(t, this[i], i, this)) return this[i]; return undefined; });
  def(Array.prototype, 'findLastIndex', function findLastIndex(fn, t) { for (var i = this.length - 1; i >= 0; i--) if (fn.call(t, this[i], i, this)) return i; return -1; });
  def(String.prototype, 'at', function at(n) { n = Math.trunc(n) || 0; if (n < 0) n += this.length; return n < 0 || n >= this.length ? undefined : this.charAt(n); });
  def(String.prototype, 'replaceAll', function replaceAll(a, b) {
    if (a instanceof RegExp) return this.replace(a, b);
    return this.split(String(a)).join(typeof b === 'function' ? b(String(a)) : b);
  });
  def(String.prototype, 'trimStart', String.prototype.trimLeft);
  def(String.prototype, 'trimEnd', String.prototype.trimRight);
  if (!Object.fromEntries) {
    Object.fromEntries = function fromEntries(it) { var o = {}; var arr = Array.from(it); for (var i = 0; i < arr.length; i++) o[arr[i][0]] = arr[i][1]; return o; };
  }
  if (!Object.hasOwn) Object.hasOwn = function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  if (typeof Promise !== 'undefined' && !Promise.allSettled) {
    Promise.allSettled = function allSettled(list) {
      return Promise.all(Array.from(list).map(function (p) {
        return Promise.resolve(p).then(function (value) { return { status: 'fulfilled', value: value }; }, function (reason) { return { status: 'rejected', reason: reason }; });
      }));
    };
  }
  if (typeof g.structuredClone === 'undefined') g.structuredClone = function (v) { return JSON.parse(JSON.stringify(v)); };
  if (typeof g.ResizeObserver === 'undefined' && typeof window !== 'undefined') {
    g.ResizeObserver = function ResizeObserver(cb) {
      var items = [];
      var timer = null;
      function check() {
        var fired = [];
        items.forEach(function (it) {
          var r = it.el.getBoundingClientRect();
          if (r.width !== it.w || r.height !== it.h) {
            it.w = r.width; it.h = r.height;
            fired.push({ target: it.el, contentRect: { x: 0, y: 0, left: 0, top: 0, width: r.width, height: r.height, right: r.width, bottom: r.height } });
          }
        });
        if (fired.length) cb(fired, this);
      }
      this.observe = function (el) {
        items.push({ el: el, w: -1, h: -1 });
        if (!timer) timer = setInterval(check.bind(this), 200);
        setTimeout(check.bind(this), 0);
      };
      this.unobserve = function (el) { items = items.filter(function (it) { return it.el !== el; }); if (!items.length && timer) { clearInterval(timer); timer = null; } };
      this.disconnect = function () { items = []; if (timer) { clearInterval(timer); timer = null; } };
    };
  }
  if (typeof window !== 'undefined' && window.CSS === undefined) window.CSS = { supports: function () { return false; } };
})();
