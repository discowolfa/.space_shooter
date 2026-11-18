const sharp = require("sharp");
(async () => {
  for (const name of ["player", "scout", "fighter", "bomber", "boss", "icon"])
    await sharp(`public/assets/${name}.svg`)
      .resize(name === "boss" ? 400 : 160, name === "boss" ? 280 : 190)
      .png()
      .toFile(`public/assets/${name}.png`);
  for (const size of [180, 192, 512])
    await sharp("public/icon.svg")
      .resize(size, size)
      .png()
      .toFile(`public/icon-${size}.png`);
})();
