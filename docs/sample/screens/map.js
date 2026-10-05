(function () {
  var wrap = document.getElementById("mapw");
  var group = document.getElementById("mg");
  if (!wrap || !group) return;
  var fit = function () {
    var k = Math.min(wrap.clientWidth / 320, wrap.clientHeight / 240);
    var x = (wrap.clientWidth - 320 * k) / 2;
    var y = (wrap.clientHeight - 240 * k) / 2;
    group.setAttribute("transform", "translate(" + x + " " + y + ") scale(" + k + ")");
  };
  if (window.ResizeObserver) new ResizeObserver(fit).observe(wrap);
  fit();
})();
