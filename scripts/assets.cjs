const fs = require("fs");
const colors = {
  player: ["#7dabb7", "#d8e8e8", "#7cfff1"],
  scout: ["#9a606f", "#d4a7b4", "#ff7389"],
  fighter: ["#836aa8", "#bdb0d3", "#e29eff"],
  bomber: ["#91764d", "#d8bd87", "#ffd183"],
  boss: ["#72667b", "#baadbc", "#ff6d75"],
};
for (const [key, [dark, light, glow]] of Object.entries(colors)) {
  fs.writeFileSync(
    `public/assets/${key}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 190"><defs><linearGradient id="h"><stop stop-color="${dark}"/><stop offset=".48" stop-color="${light}"/><stop offset=".52" stop-color="${dark}"/><stop offset="1" stop-color="#172232"/></linearGradient><radialGradient id="e"><stop stop-color="#fff"/><stop offset=".3" stop-color="${glow}"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs><ellipse cx="62" cy="160" rx="13" ry="29" fill="url(#e)"/><ellipse cx="98" cy="160" rx="13" ry="29" fill="url(#e)"/><path d="M80 8 103 65 120 77 145 144 107 133 97 159 63 159 53 133 15 144 40 77 57 65Z" fill="url(#h)" stroke="#b2ced3" stroke-width="1.5"/><path d="m80 19 9 53-9 27-9-27Z" fill="#172331" stroke="${glow}"/><path d="M44 88 58 80 55 122 29 132ZM116 88 102 80 105 122 131 132Z" fill="#273244" stroke="${dark}"/><path d="M69 100h22v40H69Z" fill="#40566a"/><path d="M76 101h8v31h-8Z" fill="${glow}"/><path d="M42 86V54h5v44m66-12V54h5v44" stroke="#bfd4da" stroke-width="4"/><path d="m59 127 7-25m35 25-7-25" stroke="${glow}" stroke-width="3"/><path d="M61 147h12m14 0h12" stroke="#0b1723" stroke-width="7"/></svg>`,
  );
}
