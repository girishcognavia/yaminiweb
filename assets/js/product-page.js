/* Product pages (/products/<cat>/<model>.html): photo thumbnails swap the main image. */
(function () {
  "use strict";
  const main = document.getElementById("pdMain"), thumbs = document.getElementById("pdThumbs");
  if (!main || !thumbs) return;
  thumbs.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-src]");
    if (!b) return;
    main.src = b.dataset.src;
    thumbs.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
  });
})();
