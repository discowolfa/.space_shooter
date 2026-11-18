import Phaser from "phaser";
import { levels, type Save } from "./model";
import {
  applyBoost,
  newBoosts,
  tickBoosts,
  weaponCount,
  readyToClear,
  rollPickup,
  supplyPickup,
  pickupStyle,
  type PickupType,
} from "./combat";
import { combatText } from "./combat-i18n";
import {
  bosses,
  enemyStats,
  bossPhase,
  entryProtected,
  DESTRUCTION_DURATION,
} from "./balance";
type Sprite = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
type Body = {
  sprite: Sprite;
  vx: number;
  vy: number;
  hp: number;
  kind: number;
  age: number;
  nextShot: number;
  final: boolean;
  maxHp: number;
  shield: number;
  armor: number;
  elite: boolean;
  phase: number;
  summons: number;
};
type Drop = {
  sprite: Phaser.GameObjects.Container;
  type: PickupType;
  age: number;
  phase: number;
};
export class Flight extends Phaser.Scene {
  save!: Save;
  persist!: () => void;
  done!: (win: boolean, score: number) => void;
  onPause: () => void = () => {};
  onStatus: (bombs: number) => void = () => {};
  player!: Phaser.GameObjects.Image;
  stars: { dot: Phaser.GameObjects.Arc; speed: number }[] = [];
  enemies: Body[] = [];
  shots: Body[] = [];
  hostile: Body[] = [];
  drops: Drop[] = [];
  active = false;
  paused = false;
  level = 1;
  hp = 100;
  shield = 25;
  score = 0;
  wave = 0;
  clock = 0;
  fire = 0;
  spawn = 0;
  invincible = 0;
  bombs = 1;
  boss = false;
  bossSpawned = false;
  boosts = newBoosts();
  missileClock = 0;
  droneClock = 0;
  supplyClock = 8;
  supplyIndex = 0;
  killsSinceDrop = 0;
  messageLeft = 0;
  bossWarning = 0;
  missionReward = 0;
  destruction: {
    body: Body;
    elapsed: number;
    nextBurst: number;
    blast: boolean;
  } | null = null;
  cinematicFx!: Phaser.GameObjects.Graphics;
  explosions: { x: number; y: number; age: number; size: number }[] = [];
  debris: {
    sprite: Sprite;
    vx: number;
    vy: number;
    spin: number;
  }[] = [];
  hud!: Phaser.GameObjects.Text;
  banner!: Phaser.GameObjects.Text;
  buffHud!: Phaser.GameObjects.Text;
  notice!: Phaser.GameObjects.Text;
  effects!: Phaser.GameObjects.Graphics;
  progress!: Phaser.GameObjects.Graphics;
  drones: Phaser.GameObjects.Image[] = [];
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  constructor() {
    super("Flight");
  }
  get words() {
    return combatText[this.save.language];
  }
  preload() {
    ["player", "scout", "fighter", "bomber", "boss"].forEach((k) =>
      this.load.image(k, `/assets/${k}.png`),
    );
  }
  create() {
    this.cameras.main.setBackgroundColor("#050b18");
    const nebula = this.add.graphics();
    for (let i = 8; i > 0; i--)
      nebula.fillStyle(0x255b8c, 0.012).fillCircle(360, 220, i * 43);
    for (let i = 0; i < 100; i++)
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
    this.player = this.add
      .image(240, 620, "player")
      .setDisplaySize(66, 86)
      .setDepth(3);
    this.effects = this.add.graphics().setDepth(2);
    this.cinematicFx = this.add.graphics().setDepth(7);
    for (const offset of [-1, 1])
      this.drones.push(
        this.add
          .image(240 + offset * 60, 630, "player")
          .setDisplaySize(25, 33)
          .setTint(0x95e9ed)
          .setDepth(3)
          .setVisible(false),
      );
    this.hud = this.add
      .text(16, 14, "", {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#c5eceb",
        lineSpacing: 6,
      })
      .setDepth(10);
    this.progress = this.add.graphics().setDepth(10);
    this.buffHud = this.add
      .text(16, 100, "", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#ffe7a1",
        lineSpacing: 5,
      })
      .setDepth(10);
    this.notice = this.add
      .text(240, 156, "", {
        align: "center",
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#c3ffee",
        backgroundColor: "#0d2535",
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5)
      .setDepth(11)
      .setVisible(false);
    this.banner = this.add
      .text(240, 330, "FRONTIER", {
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
    for (const list of [this.enemies, this.shots, this.hostile]) {
      list.forEach((b) => b.sprite.destroy());
      list.length = 0;
    }
    this.drops.forEach((d) => d.sprite.destroy());
    this.drops = [];
    this.destruction = null;
    this.explosions = [];
    this.debris.forEach((d) => d.sprite.destroy());
    this.debris = [];
    this.cinematicFx.clear();
    this.missionReward = 0;
    this.level = level;
    this.hp = 80 + this.save.upgrades.armor * 20;
    this.shield = this.save.upgrades.shield * 25;
    this.score = 0;
    this.wave = 0;
    this.clock = 0;
    this.fire = 0;
    this.spawn = 0;
    this.invincible = 1.5;
    this.bombs = 1;
    this.boss = false;
    this.bossSpawned = false;
    this.paused = false;
    this.active = true;
    this.boosts = newBoosts();
    this.missileClock = 1;
    this.droneClock = 0;
    this.supplyClock = 8;
    this.supplyIndex = 0;
    this.killsSinceDrop = 0;
    this.messageLeft = 0;
    this.bossWarning = 0;
    this.player.setPosition(240, 620).setAlpha(1).clearTint();
    this.banner.setText("").setPosition(240, 330);
    this.notice.setVisible(false);
    this.buffHud.setText("");
    this.effects.clear();
    this.drones.forEach((d) => d.setVisible(false));
    this.onStatus(this.bombs);
  }
  toggle() {
    if (!this.active) return;
    this.paused = !this.paused;
    this.banner.setText("");
    this.onPause();
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
      g.gain.setValueAtTime(0.025, context.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.13);
      o.connect(g).connect(context.destination);
      o.start();
      o.stop(context.currentTime + 0.14);
    } catch {}
  }
  body(
    x: number,
    y: number,
    kind: number,
    hp: number,
    final = false,
    elite = false,
  ): Body {
    const stats = enemyStats(this.level, this.wave, kind, elite);
    const sprite = this.add
      .image(
        x,
        y,
        kind === 3
          ? "boss"
          : kind === 2
            ? "bomber"
            : kind === 1
              ? "fighter"
              : "scout",
      )
      .setDisplaySize(
        kind === 3 ? 210 + this.level * 10 : kind === 2 ? 65 : 46,
        kind === 3 ? 145 + this.level * 5 : kind === 2 ? 65 : 50,
      )
      .setDepth(2);
    if (elite)
      sprite
        .setTint(0xffbd7e)
        .setScale(sprite.scaleX * 1.15, sprite.scaleY * 1.15);
    if (kind === 3) sprite.setTint(bosses[this.level - 1].color);
    return {
      sprite,
      vx: 0,
      vy: kind === 3 ? 0 : stats.speed,
      hp,
      kind,
      age: 0,
      nextShot: 1.4 + Math.random() * 0.5,
      final,
      maxHp: hp,
      shield: kind === 3 ? 0 : stats.shield,
      armor: kind === 3 ? 0.12 : stats.armor,
      elite,
      phase: 1,
      summons: 10,
    };
  }
  projectile(
    x: number,
    y: number,
    vx: number,
    vy: number,
    enemy = false,
    missile = false,
    drone = false,
  ) {
    const color = enemy
      ? 0xff7d7d
      : missile
        ? 0xffc27c
        : drone
          ? 0xa2d8ff
          : this.boosts.power > 0
            ? 0xffe49a
            : 0x9cfff0;
    const sprite = this.add
      .rectangle(
        x,
        y,
        missile ? 6 : this.boosts.power > 1 && !enemy ? 5 : 3,
        missile ? 18 : 15,
        color,
      )
      .setDepth(2);
    const b = {
      sprite,
      vx,
      vy,
      hp: 1,
      kind: missile ? 1 : drone ? 2 : 0,
      age: 0,
      nextShot: 0,
      final: false,
      maxHp: 1,
      shield: 0,
      armor: 0,
      elite: false,
      phase: 1,
      summons: 0,
    };
    (enemy ? this.hostile : this.shots).push(b);
  }
  burst(x: number, y: number, color = 0x8effdf) {
    for (let i = 0; i < 12; i++) {
      const p = this.add.circle(x, y, Math.random() * 3 + 1, color).setDepth(4);
      const angle = Math.random() * Math.PI * 2,
        d = 20 + Math.random() * 45;
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
  spawnPickup(type: PickupType, x = 70 + Math.random() * 340, y = -30) {
    if (this.drops.length >= 10) return;
    const style = pickupStyle[type];
    const ring = this.add
      .circle(0, 0, 22, style.color, 0.12)
      .setStrokeStyle(2, style.color);
    const plate = this.add
      .rectangle(0, 0, 27, 27, 0x0b1e2c, 0.95)
      .setStrokeStyle(1, style.color)
      .setAngle(45);
    const symbol = this.add
      .text(0, 0, style.symbol, {
        fontFamily: "monospace",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#" + style.color.toString(16).padStart(6, "0"),
      })
      .setOrigin(0.5);
    const label = this.add
      .text(0, 33, this.words[type], {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "#d9edf0",
        backgroundColor: "#071523",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5);
    const sprite = this.add
      .container(Phaser.Math.Clamp(x, 64, 416), y, [ring, plate, symbol, label])
      .setDepth(5);
    this.drops.push({
      sprite,
      type,
      age: 0,
      phase: Math.random() * Math.PI * 2,
    });
  }
  collect(type: PickupType) {
    const before = weaponCount(this.save.upgrades.weapon, this.boosts);
    const saturated =
      type === "power"
        ? before >= 5
        : type === "repair"
          ? this.hp >= 80 + this.save.upgrades.armor * 20
          : type === "shield"
            ? this.shield >= this.save.upgrades.shield * 25 + 40
            : type === "nova"
              ? this.bombs >= 3
              : this.boosts[type] >=
                { rapid: 30, missiles: 40, drone: 40, magnet: 35 }[type];
    if (saturated) {
      const reward = 10 + this.level * 3;
      this.save.crystals += reward;
      this.score += 50;
      this.notice
        .setText(`${this.words.recycled} +${reward} ◇`)
        .setVisible(true);
      this.messageLeft = 1.8;
      this.burst(this.player.x, this.player.y, 0xffdf85);
      this.persist();
      this.tone(850);
      return;
    }
    applyBoost(this.boosts, type);
    if (type === "repair")
      this.hp = Math.min(80 + this.save.upgrades.armor * 20, this.hp + 35);
    if (type === "shield")
      this.shield = Math.min(
        this.save.upgrades.shield * 25 + 40,
        this.shield + 45,
      );
    if (type === "nova") this.bombs = Math.min(3, this.bombs + 1);
    this.notice
      .setText(
        this.words[type] +
          (type === "power"
            ? " " + weaponCount(this.save.upgrades.weapon, this.boosts) + "/5"
            : ""),
      )
      .setVisible(true);
    this.messageLeft = 2.3;
    this.burst(this.player.x, this.player.y, pickupStyle[type].color);
    this.onStatus(this.bombs);
    this.tone(950);
  }
  kill(b: Body) {
    if (!b.sprite.active || (b.kind === 3 && this.destruction)) return;
    if (b.kind === 3) {
      this.beginDestruction(b);
      return;
    }
    this.burst(b.sprite.x, b.sprite.y, b.kind === 3 ? 0xffd08a : 0x83e4df);
    this.score += b.kind === 3 ? 2000 : 100 * (b.kind + 1);
    this.save.crystals += b.kind === 3 ? 100 : 5 * (b.kind + 1);
    this.killsSinceDrop++;
    if (b.kind !== 3 && (Math.random() < 0.23 || this.killsSinceDrop >= 5)) {
      this.spawnPickup(rollPickup(), b.sprite.x, b.sprite.y);
      this.killsSinceDrop = 0;
    }
    b.hp = 0;
    b.sprite.destroy();
    this.persist();
    this.tone(130);
  }
  nova() {
    if (!this.active || this.paused || this.destruction || this.bombs < 1)
      return;
    this.bombs--;
    this.onStatus(this.bombs);
    this.cameras.main.flash(250, 120, 220, 210);
    this.hostile.forEach((b) => b.sprite.destroy());
    this.hostile = [];
    for (const b of this.enemies) {
      if (b.hp <= 0) continue;
      this.hit(b, 100);
    }
    this.tone(70);
  }
  damage(amount: number) {
    if (!this.active || this.destruction || this.invincible > 0) return;
    const absorbed = Math.min(this.shield, amount);
    this.shield -= absorbed;
    this.hp = Math.max(0, this.hp - (amount - absorbed));
    this.invincible = 1.2;
    this.cameras.main.shake(120, 0.008);
    if (this.hp <= 0) this.end(false);
  }
  end(win: boolean) {
    if (!this.active) return;
    this.active = false;
    this.player.setAlpha(1);
    this.done(win, this.score);
  }
  spawnWave() {
    const config = levels[this.level - 1];
    this.wave++;
    this.spawn = config.interval;
    const final = this.wave === config.waves;
    const count = final ? 6 : 3 + Math.min(3, Math.floor(this.wave / 5));
    for (let i = 0; i < count; i++) {
      const formation = this.wave % 3;
      const x =
        formation === 0
          ? 80 + i * (320 / Math.max(1, count - 1))
          : formation === 1
            ? 240 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 57
            : 65 + i * (350 / Math.max(1, count - 1));
      const y =
        formation === 1
          ? -50 - Math.abs(i - (count - 1) / 2) * 55
          : -50 - i * 36;
      const kind = (this.wave + i) % 3;
      this.enemies.push(
        this.body(
          x,
          y,
          kind,
          enemyStats(
            this.level,
            this.wave,
            kind,
            this.level >= 2 &&
              (i + this.wave) % Math.max(2, 6 - this.level) === 0,
          ).hp,
          final,
          this.level >= 2 &&
            (i + this.wave) % Math.max(2, 6 - this.level) === 0,
        ),
      );
    }
    if (final) {
      this.notice.setText(this.words.final).setVisible(true);
      this.messageLeft = 3;
    }
  }
  hit(b: Body, damage: number) {
    if (
      b.hp <= 0 ||
      !b.sprite.active ||
      this.destruction ||
      entryProtected(b.sprite.y, b.age)
    )
      return;
    const shieldHit = Math.min(b.shield, damage);
    b.shield -= shieldHit;
    b.hp -= (damage - shieldHit) * (1 - b.armor);
    if (b.hp <= 0) this.kill(b);
  }
  updateBoss(b: Body, dt: number) {
    if (b.sprite.y < 175) {
      b.sprite.y = Math.min(175, b.sprite.y + 95 * dt);
      return;
    }
    const phase = bossPhase(b.hp, b.maxHp);
    if (phase !== b.phase) {
      b.phase = phase;
      this.notice
        .setText(
          bosses[this.level - 1].name + " / " + this.words.phase + " " + phase,
        )
        .setVisible(true);
      this.messageLeft = 2;
      this.cameras.main.shake(180, 0.003);
    }
    b.sprite.x =
      240 +
      Math.sin(b.age * (0.55 + this.level * 0.08)) * (65 + this.level * 11);
    if (b.age >= b.nextShot) {
      b.nextShot =
        b.age + Math.max(0.48, 1.5 - this.level * 0.09 - (phase - 1) * 0.28);
      const a = Math.atan2(
          this.player.y - b.sprite.y,
          this.player.x - b.sprite.x,
        ),
        speed = 125 + this.level * 13 + phase * 7;
      const count = phase + Math.floor(this.level / 2);
      for (let j = -count; j <= count; j++)
        this.projectile(
          b.sprite.x,
          b.sprite.y + 35,
          Math.cos(a + j * 0.17) * speed,
          Math.sin(a + j * 0.17) * speed,
          true,
        );
      if (phase >= 2)
        for (let i = 0; i < 8 + this.level * 2; i++) {
          const angle = (i * Math.PI * 2) / (8 + this.level * 2) + b.age * 0.2;
          this.projectile(
            b.sprite.x,
            b.sprite.y,
            Math.cos(angle) * (95 + this.level * 8),
            Math.sin(angle) * (95 + this.level * 8),
            true,
          );
        }
    }
    b.summons -= dt;
    if (this.level >= 2 && phase >= 2 && b.summons <= 0) {
      b.summons = 13;
      for (const x of [80, 400]) {
        const stat = enemyStats(this.level, this.wave, 1);
        this.enemies.push(this.body(x, -45, 1, stat.hp));
      }
    }
  }
  beginDestruction(b: Body) {
    b.hp = 0;
    this.destruction = { body: b, elapsed: 0, nextBurst: 0, blast: false };
    this.shots.forEach((s) => s.sprite.destroy());
    this.shots = [];
    this.hostile.forEach((s) => s.sprite.destroy());
    this.hostile = [];
    this.drops.forEach((d) => d.sprite.destroy());
    this.drops = [];
    this.enemies.filter((e) => e !== b).forEach((e) => e.sprite.destroy());
    this.enemies = [b];
    this.notice.setVisible(false);
    this.drones.forEach((d) => d.setVisible(false));
    this.effects.clear();
    this.buffHud.setText("");
    this.progress.clear();
    this.hud.setText(
      bosses[this.level - 1].name +
        " / " +
        this.words.phase +
        " " +
        b.phase +
        "\n" +
        this.words.reactor,
    );
    this.banner
      .setText(this.words.reactor)
      .setPosition(240, 365)
      .setFontSize(20);
    this.onStatus(0);
  }
  updateDestruction(dt: number) {
    const state = this.destruction!;
    state.elapsed += dt;
    const t = state.elapsed,
      b = state.body;
    this.banner.setText(t < 3 ? this.words.reactor : this.words.destroyed);
    if (t < 3) {
      b.sprite
        .setPosition(
          b.sprite.x + Math.sin(t * 43) * dt * 18,
          b.sprite.y + Math.cos(t * 29) * dt * 12,
        )
        .setAlpha(0.7 + Math.sin(t * 35) * 0.25);
      if (b.sprite instanceof Phaser.GameObjects.Image)
        b.sprite.setTint(t % 0.3 < 0.15 ? 0xff9c63 : 0xffffff);
    }
    if (t >= state.nextBurst && t < 3) {
      state.nextBurst = t + 0.16;
      this.explosions.push({
        x: b.sprite.x + (Math.random() - 0.5) * 160,
        y: b.sprite.y + (Math.random() - 0.5) * 115,
        age: 0,
        size: 24 + Math.random() * 25,
      });
      this.cameras.main.shake(110, 0.0025);
      this.tone(90 + Math.random() * 100);
    }
    if (t >= 3 && !state.blast) {
      state.blast = true;
      const x = b.sprite.x,
        y = b.sprite.y;
      b.sprite.destroy();
      this.cameras.main.flash(450, 255, 226, 185);
      this.cameras.main.shake(750, 0.009);
      this.tone(55);
      this.banner.setText(this.words.destroyed);
      this.hud.setText(
        bosses[this.level - 1].name + "\n" + this.words.destroyed,
      );
      for (const side of [0, 1]) {
        const hull = this.add
          .image(x, y, "boss")
          .setCrop(side * 200, 0, 200, 280)
          .setDisplaySize(210 + this.level * 10, 145 + this.level * 5)
          .setTint(bosses[this.level - 1].color)
          .setDepth(8);
        this.debris.push({
          sprite: hull,
          vx: side ? 65 : -65,
          vy: 45,
          spin: side ? 0.55 : -0.55,
        });
      }
      for (let i = 0; i < 30; i++) {
        const a = Math.random() * Math.PI * 2,
          speed = 50 + Math.random() * 170;
        const sprite = this.add
          .rectangle(
            x,
            y,
            5 + Math.random() * 20,
            3 + Math.random() * 11,
            i % 3 ? 0x8196a7 : 0xffbc71,
          )
          .setDepth(8);
        this.debris.push({
          sprite,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          spin: (Math.random() - 0.5) * 8,
        });
      }
    }
    this.cinematicFx.clear();
    for (const e of this.explosions) {
      e.age += dt;
      const k = Math.max(0, 1 - e.age / 0.85);
      this.cinematicFx
        .fillStyle(0xff632d, k * 0.35)
        .fillCircle(e.x, e.y, e.size * (1 + e.age * 2))
        .fillStyle(0xffd986, k * 0.8)
        .fillCircle(e.x, e.y, e.size * k * 0.7)
        .fillStyle(0xfff2d5, k)
        .fillCircle(e.x, e.y, e.size * k * 0.25);
    }
    this.explosions = this.explosions.filter((e) => e.age < 0.85);
    if (state.blast) {
      const age = t - 3;
      for (let i = 0; i < 2; i++)
        this.cinematicFx
          .lineStyle(
            Math.max(1, 8 - age * 2),
            i ? 0xffb36b : 0xe7faff,
            Math.max(0, 1 - age / 2.2),
          )
          .strokeCircle(240, 175, Math.max(1, age * (i ? 210 : 300)));
    }
    for (const d of this.debris) {
      d.sprite.x += d.vx * dt;
      d.sprite.y += d.vy * dt;
      d.sprite.rotation += d.spin * dt;
      d.sprite.setAlpha(Math.max(0, 1 - (t - 3) / 2.5));
    }
    if (t >= DESTRUCTION_DURATION) {
      this.missionReward = bosses[this.level - 1].reward;
      this.save.crystals += this.missionReward;
      this.score += 2000 * this.level;
      this.persist();
      this.cinematicFx.clear();
      this.debris.forEach((d) => d.sprite.destroy());
      this.debris = [];
      this.banner.setText("");
      this.destruction = null;
      this.end(true);
    }
  }
  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.paused) return;
    for (const s of this.stars) {
      s.dot.y += s.speed * dt;
      if (s.dot.y > 760) {
        s.dot.y = 0;
        s.dot.x = Math.random() * 480;
      }
    }
    if (!this.active) return;
    if (this.destruction) {
      this.updateDestruction(dt);
      return;
    }
    this.clock += dt;
    this.invincible -= dt;
    tickBoosts(this.boosts, dt);
    this.messageLeft -= dt;
    if (this.messageLeft <= 0) this.notice.setVisible(false);
    this.player.setAlpha(
      this.invincible > 0 ? 0.6 + Math.sin(this.clock * 35) * 0.25 : 1,
    );
    this.player.setTint(this.boosts.power > 0 ? 0xffe8b9 : 0xffffff);
    let dx =
        Number(this.cursors.right.isDown || this.keys.D.isDown) -
        Number(this.cursors.left.isDown || this.keys.A.isDown),
      dy =
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
    this.player.y = Phaser.Math.Clamp(this.player.y, 160, 700);
    this.fire -= dt;
    this.missileClock -= dt;
    this.droneClock -= dt;
    if (this.fire <= 0) {
      this.fire = this.boosts.rapid > 0 ? 0.14 : 0.25;
      const n = weaponCount(this.save.upgrades.weapon, this.boosts);
      for (let i = 0; i < n; i++)
        this.projectile(
          this.player.x + (i - (n - 1) / 2) * 12,
          this.player.y - 34,
          (i - (n - 1) / 2) * 46,
          -550,
        );
      this.tone(600);
    }
    if (this.missileClock <= 0) {
      this.missileClock = this.boosts.missiles > 0 ? 0.95 : 3.2;
      for (const x of this.boosts.missiles > 0 ? [-22, 22] : [0])
        this.projectile(
          this.player.x + x,
          this.player.y - 20,
          0,
          -330,
          false,
          true,
        );
    }
    for (let i = 0; i < 2; i++) {
      const drone = this.drones[i];
      drone
        .setVisible(this.boosts.drone > 0)
        .setPosition(
          Phaser.Math.Clamp(this.player.x + (i ? 1 : -1) * 54, 14, 466),
          this.player.y + 12 + Math.sin(this.clock * 3 + i) * 9,
        );
      if (this.boosts.drone > 0 && this.droneClock <= 0)
        this.projectile(
          drone.x,
          drone.y - 18,
          (i ? 1 : -1) * 20,
          -560,
          false,
          false,
          true,
        );
    }
    if (this.droneClock <= 0) this.droneClock = 0.28;
    this.effects.clear();
    if (this.shield > 0)
      this.effects
        .lineStyle(2, 0x72caff, 0.25 + Math.sin(this.clock * 3) * 0.1)
        .strokeEllipse(this.player.x, this.player.y, 83, 104);
    if (this.boosts.magnet > 0)
      this.effects
        .lineStyle(1, 0xffee9a, 0.2)
        .strokeCircle(this.player.x, this.player.y, 105);
    const gunCount = weaponCount(this.save.upgrades.weapon, this.boosts);
    if (gunCount > 1)
      for (let i = 0; i < gunCount; i++)
        this.effects
          .fillStyle(this.boosts.rapid > 0 ? 0xff8ee5 : 0xffd88a, 0.9)
          .fillCircle(
            this.player.x + (i - (gunCount - 1) / 2) * 12,
            this.player.y - 24,
            3,
          );
    const config = levels[this.level - 1];
    this.spawn -= dt;
    if (this.spawn <= 0 && this.wave < config.waves) this.spawnWave();
    this.supplyClock -= dt;
    if (this.supplyClock <= 0) {
      this.spawnPickup(supplyPickup(this.supplyIndex++));
      this.supplyClock = 16 + Math.random() * 5;
    }
    if (
      readyToClear(
        config,
        this.clock,
        this.wave,
        this.enemies.filter((b) => b.hp > 0).length,
      )
    ) {
      if (!this.bossSpawned) {
        this.bossSpawned = true;
        this.boss = true;
        this.bossWarning = 3;
        this.banner
          .setText(this.words.boss + "\n" + bosses[this.level - 1].name)
          .setFontSize(16);
        this.hostile.forEach((b) => b.sprite.destroy());
        this.hostile = [];
      }
    }
    if (this.bossWarning > 0) {
      this.bossWarning -= dt;
      if (this.bossWarning <= 0) {
        this.banner.setText("");
        this.enemies.push(this.body(240, -110, 3, bosses[this.level - 1].hp));
      }
    }
    for (const b of this.enemies) {
      if (b.hp <= 0) continue;
      b.age += dt;
      if (b.kind === 3) {
        this.updateBoss(b, dt);
      } else {
        b.sprite.y += b.vy * dt;
        const strafe =
          b.kind === 1 ? (b.elite ? 100 : 60) : b.kind === 2 ? 18 : 35;
        b.sprite.x = Phaser.Math.Clamp(
          b.sprite.x +
            Math.sin(b.age * (b.kind === 1 ? 2.8 : 1.5) + this.wave) *
              dt *
              strafe,
          30,
          450,
        );
        if (b.sprite.y > 810) {
          if (b.final) {
            b.sprite.y = -80;
            b.age = 0;
            b.nextShot = 1.6;
          } else {
            b.hp = 0;
            b.sprite.destroy();
            continue;
          }
        }
        const stats = enemyStats(this.level, this.wave, b.kind, b.elite);
        if (
          !entryProtected(b.sprite.y, b.age) &&
          b.sprite.y < 680 &&
          b.age >= b.nextShot
        ) {
          b.nextShot = b.age + stats.fireInterval;
          const aimed = Math.atan2(
            this.player.y - b.sprite.y,
            this.player.x - b.sprite.x,
          );
          const spread = b.elite || (b.kind === 2 && this.level >= 3) ? 1 : 0;
          for (let j = -spread; j <= spread; j++)
            this.projectile(
              b.sprite.x,
              b.sprite.y,
              Math.cos(aimed + j * 0.2) * stats.shotSpeed,
              Math.sin(aimed + j * 0.2) * stats.shotSpeed,
              true,
            );
        }
      }
      if (entryProtected(b.sprite.y, b.age) || b.shield > 0)
        this.effects
          .lineStyle(
            entryProtected(b.sprite.y, b.age) ? 2 : 1,
            b.elite ? 0xffb16d : 0x79bcff,
            entryProtected(b.sprite.y, b.age) ? 0.65 : 0.4,
          )
          .strokeEllipse(
            b.sprite.x,
            b.sprite.y,
            b.kind === 3 ? 250 : 76,
            b.kind === 3 ? 180 : 80,
          );
      if (b.elite || b.kind === 3) {
        const width = b.kind === 3 ? 150 : 45;
        this.effects
          .fillStyle(0x422c35, 0.8)
          .fillRect(
            b.sprite.x - width / 2,
            b.sprite.y - (b.kind === 3 ? 90 : 44),
            width,
            3,
          )
          .fillStyle(b.elite ? 0xffb16d : 0xff7b85)
          .fillRect(
            b.sprite.x - width / 2,
            b.sprite.y - (b.kind === 3 ? 90 : 44),
            width * Math.max(0, b.hp / b.maxHp),
            3,
          );
      }
      if (
        Phaser.Math.Distance.Between(
          b.sprite.x,
          b.sprite.y,
          this.player.x,
          this.player.y,
        ) < (b.kind === 3 ? 95 : 34)
      )
        this.damage(24);
    }
    if (!this.active) return;
    for (const [list, enemy] of [
      [this.shots, false],
      [this.hostile, true],
    ] as const) {
      for (const b of list) {
        if (!b.sprite.active) continue;
        b.age += dt;
        if (b.kind === 1 && !enemy) {
          const target = this.enemies.find(
            (e) => e.hp > 0 && !entryProtected(e.sprite.y, e.age),
          );
          if (target) {
            const a = Math.atan2(
              target.sprite.y - b.sprite.y,
              target.sprite.x - b.sprite.x,
            );
            b.vx = Phaser.Math.Linear(
              b.vx,
              Math.cos(a) * 400,
              Math.min(1, dt * 6),
            );
            b.vy = Phaser.Math.Linear(
              b.vy,
              Math.sin(a) * 400,
              Math.min(1, dt * 6),
            );
          }
        }
        b.sprite.x += b.vx * dt;
        b.sprite.y += b.vy * dt;
        if (
          b.age > 6 ||
          b.sprite.y < -60 ||
          b.sprite.y > 820 ||
          b.sprite.x < -40 ||
          b.sprite.x > 520
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
            ) < 20
          ) {
            b.sprite.destroy();
            this.damage(15);
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
              this.hit(
                e,
                b.kind === 1
                  ? 36
                  : b.kind === 2
                    ? 7
                    : 11 + Math.min(3, this.boosts.power),
              );
              b.sprite.destroy();
              break;
            }
          }
      }
    }
    if (!this.active || this.destruction) return;
    for (const d of this.drops) {
      d.age += dt;
      const distance = Phaser.Math.Distance.Between(
        d.sprite.x,
        d.sprite.y,
        this.player.x,
        this.player.y,
      );
      const magnet = this.boosts.magnet > 0 && distance < 230;
      if (magnet && distance > 1) {
        d.sprite.x += ((this.player.x - d.sprite.x) / distance) * 250 * dt;
        d.sprite.y += ((this.player.y - d.sprite.y) / distance) * 250 * dt;
      } else {
        d.sprite.y += 64 * dt;
        d.sprite.x += Math.sin(d.age * 2 + d.phase) * 12 * dt;
      }
      d.sprite.setScale(1 + Math.sin(d.age * 4) * 0.06);
      if (distance < 40) {
        this.collect(d.type);
        d.sprite.destroy();
      } else if (d.sprite.y > 820 || d.age > 20) d.sprite.destroy();
    }
    this.enemies = this.enemies.filter((b) => b.hp > 0);
    this.shots = this.shots.filter((b) => b.sprite.active);
    this.hostile = this.hostile.filter((b) => b.sprite.active);
    this.drops = this.drops.filter((d) => d.sprite.active);
    const timer = Math.floor(this.clock),
      boss = this.enemies.find((e) => e.kind === 3);
    const progress = Math.min(1, this.clock / config.duration);
    this.hud.setText(
      `${this.words.sector} ${this.level}   ${String(this.score).padStart(6, "0")}   ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, "0")}\nHP ${Math.ceil(this.hp)}   S ${Math.ceil(this.shield)}   ◇ ${this.save.crystals}\n${this.boss ? "BOSS " + Math.max(0, Math.ceil(((boss?.hp ?? bosses[this.level - 1].hp) / bosses[this.level - 1].hp) * 100)) + "%" : this.words.wave + " " + this.wave + "/" + config.waves}   P ${gunCount}/5   N ${this.bombs}`,
    );
    this.progress
      .clear()
      .fillStyle(0x203c4b)
      .fillRoundedRect(16, 86, 448, 4, 2)
      .fillStyle(this.boss ? 0xff8a93 : 0x99dfd3)
      .fillRoundedRect(
        16,
        86,
        448 *
          (this.boss
            ? Math.max(
                0,
                (boss?.hp ?? bosses[this.level - 1].hp) /
                  bosses[this.level - 1].hp,
              )
            : progress),
        4,
        2,
      );
    const timers = (["rapid", "missiles", "drone", "magnet"] as const)
      .filter((k) => this.boosts[k] > 0)
      .map((k) => `${pickupStyle[k].symbol} ${Math.ceil(this.boosts[k])}s`);
    this.buffHud.setText(timers.join("   "));
  }
}
let audio: AudioContext | undefined;
