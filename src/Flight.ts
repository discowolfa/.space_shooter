import Phaser from "phaser";
import { levels, type Save } from "./model";
type Body = {
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  hp: number;
  kind: number;
  age: number;
};
export class Flight extends Phaser.Scene {
  save!: Save;
  persist!: () => void;
  done!: (win: boolean, score: number) => void;
  player!: Phaser.GameObjects.Image;
  stars: { dot: Phaser.GameObjects.Arc; speed: number }[] = [];
  enemies: Body[] = [];
  shots: Body[] = [];
  hostile: Body[] = [];
  drops: Body[] = [];
  active = false;
  paused = false;
  level = 1;
  hp = 100;
  shield = 30;
  score = 0;
  wave = 0;
  clock = 0;
  fire = 0;
  spawn = 0;
  invincible = 0;
  bombs = 1;
  boss = false;
  bossSpawned = false;
  hud!: Phaser.GameObjects.Text;
  banner!: Phaser.GameObjects.Text;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  constructor() {
    super("Flight");
  }
  preload() {
    ["player", "scout", "fighter", "bomber", "boss", "icon"].forEach((k) =>
      this.load.image(k, `/assets/${k}.png`),
    );
  }
  create() {
    this.cameras.main.setBackgroundColor("#050b18");
    const nebula = this.add.graphics();
    for (let i = 8; i > 0; i--)
      nebula.fillStyle(0x255b8c, 0.012).fillCircle(360, 220, i * 43);
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        dot: this.add.circle(
          Math.random() * 480,
          Math.random() * 760,
          Math.random() * 1.2 + 0.3,
          0xc8e5ff,
          Math.random() * 0.7 + 0.2,
        ),
        speed: 15 + Math.random() * 65,
      });
    }
    this.player = this.add.image(240, 620, "player").setDisplaySize(66, 86);
    this.add.text(22, 705, "SCOUT / AX-01", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#6a899e",
    });
    this.hud = this.add
      .text(20, 18, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#aeeae7",
        lineSpacing: 9,
      })
      .setDepth(10);
    this.banner = this.add
      .text(240, 340, "FRONTIER\n\nFLIGHT SYSTEM READY", {
        align: "center",
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#b9e9e8",
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,SPACE,ESC",
    ) as typeof this.keys;
    this.keys.SPACE.on("down", () => this.nova());
    this.keys.ESC.on("down", () => this.toggle());
  }
  start(level: number) {
    for (const list of [this.enemies, this.shots, this.hostile, this.drops]) {
      list.forEach((b) => b.sprite.destroy());
      list.length = 0;
    }
    this.level = level;
    this.hp = 80 + this.save.upgrades.armor * 20;
    this.shield = this.save.upgrades.shield * 25;
    this.score = 0;
    this.wave = 0;
    this.clock = 0;
    this.fire = 0;
    this.spawn = 0;
    this.invincible = 0;
    this.bombs = 1;
    this.boss = false;
    this.bossSpawned = false;
    this.paused = false;
    this.active = true;
    this.player.setPosition(240, 620).setAlpha(1);
    this.banner.setText("");
  }
  toggle() {
    if (!this.active) return;
    this.paused = !this.paused;
    this.banner.setText(this.paused ? "Ⅱ" : "");
  }
  tone(freq = 300) {
    if (!this.save?.sound) return;
    try {
      const context = (audio ??= new AudioContext());
      if (context.state === "suspended") void context.resume();
      const o = context.createOscillator(),
        g = context.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, context.currentTime);
      o.frequency.exponentialRampToValueAtTime(60, context.currentTime + 0.1);
      g.gain.setValueAtTime(0.035, context.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.13);
      o.connect(g).connect(context.destination);
      o.start();
      o.stop(context.currentTime + 0.14);
    } catch {}
  }
  body(x: number, y: number, kind: number, hp: number): Body {
    const key =
      kind === 3
        ? "boss"
        : kind === 2
          ? "bomber"
          : kind === 1
            ? "fighter"
            : "scout";
    return {
      sprite: this.add
        .image(x, y, key)
        .setDisplaySize(
          kind === 3 ? 200 : kind === 2 ? 65 : 46,
          kind === 3 ? 140 : kind === 2 ? 65 : 50,
        ),
      vx: 0,
      vy: kind === 3 ? 0 : 65 + this.level * 12,
      hp,
      kind,
      age: 0,
    };
  }
  projectile(
    x: number,
    y: number,
    vx: number,
    vy: number,
    enemy = false,
    missile = false,
  ) {
    const g = this.add
      .rectangle(
        x,
        y,
        missile ? 6 : 3,
        missile ? 18 : 13,
        enemy ? 0xff7d7d : 0x9cfff0,
      )
      .setDepth(2);
    const b = {
      sprite: g as unknown as Phaser.GameObjects.Image,
      vx,
      vy,
      hp: 1,
      kind: missile ? 1 : 0,
      age: 0,
    };
    (enemy ? this.hostile : this.shots).push(b);
  }
  burst(x: number, y: number, color = 0x8effdf) {
    for (let i = 0; i < 12; i++) {
      const p = this.add.circle(x, y, Math.random() * 3 + 1, color);
      const angle = Math.random() * Math.PI * 2;
      const d = 20 + Math.random() * 45;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * d,
        y: y + Math.sin(angle) * d,
        alpha: 0,
        duration: 350,
        onComplete: () => p.destroy(),
      });
    }
  }
  kill(b: Body) {
    this.burst(b.sprite.x, b.sprite.y, b.kind === 3 ? 0xffd08a : 0x83e4df);
    this.score += b.kind === 3 ? 2000 : 100 * (b.kind + 1);
    this.save.crystals += b.kind === 3 ? 100 : 5 * (b.kind + 1);
    if (Math.random() < 0.2) {
      const d = this.body(b.sprite.x, b.sprite.y, 0, 1);
      d.sprite.setTexture("icon").setDisplaySize(22, 22);
      d.vy = 85;
      this.drops.push(d);
    }
    b.hp = 0;
    b.sprite.destroy();
    this.persist();
    this.tone(130);
  }
  nova() {
    if (!this.active || this.paused || this.bombs < 1) return;
    this.bombs--;
    this.cameras.main.flash(250, 120, 220, 210);
    this.hostile.forEach((b) => b.sprite.destroy());
    this.hostile = [];
    for (const b of this.enemies) {
      b.hp -= 90;
      if (b.hp <= 0) this.kill(b);
    }
    this.tone(70);
  }
  damage(amount: number) {
    if (this.invincible > 0) return;
    const absorbed = Math.min(this.shield, amount);
    this.shield -= absorbed;
    this.hp -= amount - absorbed;
    this.invincible = 1;
    this.cameras.main.shake(120, 0.008);
    if (this.hp <= 0) this.end(false);
  }
  end(win: boolean) {
    if (!this.active) return;
    this.active = false;
    this.player.setAlpha(1);
    this.done(win, this.score);
  }
  update(_time: number, delta: number) {
    const dt = Math.min(delta, 40) / 1000;
    if (this.paused) return;
    for (const s of this.stars) {
      s.dot.y += s.speed * dt;
      if (s.dot.y > 760) {
        s.dot.y = 0;
        s.dot.x = Math.random() * 480;
      }
    }
    if (!this.active) return;
    this.clock += dt;
    this.invincible -= dt;
    this.player.setAlpha(
      this.invincible > 0 ? 0.45 + Math.sin(this.clock * 35) * 0.3 : 1,
    );
    let dx =
      Number(this.cursors.right.isDown || this.keys.D.isDown) -
      Number(this.cursors.left.isDown || this.keys.A.isDown);
    let dy =
      Number(this.cursors.down.isDown || this.keys.S.isDown) -
      Number(this.cursors.up.isDown || this.keys.W.isDown);
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      this.player.x += (dx / len) * 310 * dt;
      this.player.y += (dy / len) * 310 * dt;
    }
    const p = this.input.activePointer;
    if (p.isDown) {
      this.player.x = Phaser.Math.Linear(
        this.player.x,
        p.x,
        Math.min(1, dt * 12),
      );
      this.player.y = Phaser.Math.Linear(
        this.player.y,
        p.y - (p.wasTouch ? 65 : 0),
        Math.min(1, dt * 12),
      );
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 25, 455);
    this.player.y = Phaser.Math.Clamp(this.player.y, 90, 700);
    this.fire -= dt;
    if (this.fire <= 0) {
      this.fire = 0.22;
      const n = this.save.upgrades.weapon;
      for (let i = 0; i < n; i++)
        this.projectile(
          this.player.x + (i - (n - 1) / 2) * 13,
          this.player.y - 34,
          (i - (n - 1) / 2) * 35,
          -550,
        );
      if (Math.floor(this.clock * 5) % 12 === 0)
        this.projectile(this.player.x, this.player.y, 0, -330, false, true);
      this.tone(600);
    }
    this.spawn -= dt;
    if (this.spawn <= 0 && this.wave < levels[this.level - 1].waves) {
      this.spawn = 4.5;
      this.wave++;
      for (let i = 0; i < 4; i++)
        this.enemies.push(
          this.body(
            65 + i * 115,
            -50 - i * 45,
            (this.wave + i) % 3,
            15 + this.level * 6 + ((this.wave + i) % 3) * 10,
          ),
        );
    }
    if (
      this.wave >= levels[this.level - 1].waves &&
      !this.enemies.some((b) => b.hp > 0)
    ) {
      if (this.level === 5 && !this.bossSpawned) {
        this.bossSpawned = true;
        this.boss = true;
        this.enemies.push(this.body(240, 120, 3, 1600));
        this.banner.setText("BOSS INCOMING");
        this.time.delayedCall(2000, () => this.banner.setText(""));
      } else this.end(true);
    }
    for (const b of this.enemies) {
      if (b.hp <= 0) continue;
      b.age += dt;
      b.sprite.y += b.vy * dt;
      b.sprite.x +=
        Math.sin(b.age * (b.kind === 1 ? 3 : 1)) *
        dt *
        (b.kind === 3 ? 65 : 25);
      if (b.sprite.y > 800) {
        b.hp = 0;
        b.sprite.destroy();
        continue;
      }
      if (
        Math.floor((b.age - dt) * (b.kind === 3 && b.hp < 800 ? 3 : 1)) <
        Math.floor(b.age * (b.kind === 3 && b.hp < 800 ? 3 : 1))
      ) {
        const a = Math.atan2(
          this.player.y - b.sprite.y,
          this.player.x - b.sprite.x,
        );
        for (let j = -(b.kind === 3 ? 2 : 0); j <= (b.kind === 3 ? 2 : 0); j++)
          this.projectile(
            b.sprite.x,
            b.sprite.y,
            Math.cos(a + j * 0.22) * 160,
            Math.sin(a + j * 0.22) * 160,
            true,
          );
      }
      if (
        Phaser.Math.Distance.Between(
          b.sprite.x,
          b.sprite.y,
          this.player.x,
          this.player.y,
        ) < (b.kind === 3 ? 100 : 40)
      )
        this.damage(30);
    }
    for (const [list, enemy] of [
      [this.shots, false],
      [this.hostile, true],
    ] as const) {
      for (const b of list) {
        if (!b.sprite.active) continue;
        if (b.kind === 1 && !enemy) {
          const target = this.enemies.find((e) => e.hp > 0);
          if (target) {
            const a = Math.atan2(
              target.sprite.y - b.sprite.y,
              target.sprite.x - b.sprite.x,
            );
            b.vx = Phaser.Math.Linear(b.vx, Math.cos(a) * 400, 0.1);
            b.vy = Phaser.Math.Linear(b.vy, Math.sin(a) * 400, 0.1);
          }
        }
        b.sprite.x += b.vx * dt;
        b.sprite.y += b.vy * dt;
        if (
          b.sprite.y < -40 ||
          b.sprite.y > 800 ||
          b.sprite.x < -30 ||
          b.sprite.x > 510
        ) {
          b.sprite.destroy();
          continue;
        }
        if (enemy) {
          if (
            Phaser.Math.Distance.Between(
              b.sprite.x,
              b.sprite.y,
              this.player.x,
              this.player.y,
            ) < 24
          ) {
            b.sprite.destroy();
            this.damage(18);
          }
        } else
          for (const e of this.enemies) {
            if (
              e.hp > 0 &&
              Phaser.Math.Distance.Between(
                e.sprite.x,
                e.sprite.y,
                b.sprite.x,
                b.sprite.y,
              ) < (e.kind === 3 ? 85 : 28)
            ) {
              e.hp -= b.kind === 1 ? 35 : 12;
              b.sprite.destroy();
              if (e.hp <= 0) this.kill(e);
              break;
            }
          }
      }
    }
    for (const b of this.drops) {
      b.sprite.y += b.vy * dt;
      if (
        Phaser.Math.Distance.Between(
          b.sprite.x,
          b.sprite.y,
          this.player.x,
          this.player.y,
        ) < 35
      ) {
        this.hp = Math.min(80 + this.save.upgrades.armor * 20, this.hp + 20);
        this.shield = Math.min(
          this.save.upgrades.shield * 25,
          this.shield + 15,
        );
        b.sprite.destroy();
      } else if (b.sprite.y > 800) b.sprite.destroy();
    }
    this.enemies = this.enemies.filter((b) => b.hp > 0);
    this.shots = this.shots.filter((b) => b.sprite.active);
    this.hostile = this.hostile.filter((b) => b.sprite.active);
    this.drops = this.drops.filter((b) => b.sprite.active);
    this.hud.setText(
      `${String(this.level).padStart(2, "0")} / SECTOR     ${String(this.score).padStart(6, "0")}\nHP ${Math.ceil(this.hp)}  ◇ ${Math.ceil(this.shield)}  ✦ ${this.save.crystals}\n${this.boss ? "DESTROYER " + Math.max(0, Math.ceil((this.enemies[0]?.hp ?? 0) / 16)) + "%" : "WAVE " + this.wave + " / " + levels[this.level - 1].waves}`,
    );
  }
}
let audio: AudioContext | undefined;
