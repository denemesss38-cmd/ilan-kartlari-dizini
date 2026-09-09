// Üçe bölünmüş fotoğraf galerisi: otomatik döner, swipe ve oklarla gezinir.
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll(".gallery[data-photos]").forEach(function (el) {
    var photos = [];
    try {
      photos = JSON.parse(el.getAttribute("data-photos")) || [];
    } catch (e) {
      return;
    }
    if (photos.length < 2) return;

    var slots = el.querySelectorAll(".slot img");
    var interval = parseInt(el.getAttribute("data-interval"), 10) || 0;
    var offset = 0;

    function render() {
      slots.forEach(function (img, i) {
        var next = photos[(offset + i) % photos.length];
        if (img.getAttribute("src") !== next) img.setAttribute("src", next);
      });
    }

    function step(dir) {
      offset = (offset + dir + photos.length) % photos.length;
      render();
    }

    el.querySelectorAll(".nav").forEach(function (btn) {
      btn.addEventListener("click", function () {
        step(btn.classList.contains("prev") ? -1 : 1);
      });
    });

    var startX = null;
    var startY = null;
    el.addEventListener(
      "touchstart",
      function (e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
      },
      { passive: true },
    );
    el.addEventListener(
      "touchend",
      function (e) {
        if (startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
        startX = startY = null;
      },
      { passive: true },
    );

    if (interval > 0 && !reduce) {
      setInterval(function () {
        step(1);
      }, interval * 1000);
    }
  });
})();
