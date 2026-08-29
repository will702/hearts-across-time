import Phaser from 'phaser';

type ArrivalConfig = {
  caption: string;
  duration: number;
  startZoom: number;
  startFocusX: number;
  endFocusX: number;
  groundY: number;
  barColor?: number;
  /** Tekstur lukisan intro era (legacy bunker/lab); menutupi dunia selama sinematik. */
  backdrop?: string;
  characterPose?: string;
  onComplete: () => void;
};

export function playArrivalSequence(scene: Phaser.Scene, config: ArrivalConfig): void {
  const camera = scene.cameras.main;
  const reduced = Boolean(scene.registry.get('reduceMotion'));
  const progress = { value: 0 };
  let finished = false;
  camera.stopFollow();
  camera.setZoom(reduced ? 1 : config.startZoom);
  camera.centerOn(config.startFocusX, config.groundY - 120);

  let barColor = config.barColor ?? 0xa85550;
  if (!config.barColor) {
    if (config.caption.includes('1968') && config.caption.includes('BUNKER')) barColor = 0x6b91a8;
    else if (config.caption.includes('1968')) barColor = 0x5d91a9;
    else if (config.caption.includes('1999')) barColor = 0x64a3bc;
    else if (config.caption.includes('1944')) barColor = 0xa85550;
  }

  // Lukisan intro era: kamera besar lalu mundur (keyframe Ken Burns)
  let backdrop: Phaser.GameObjects.Image | undefined;
  if (config.backdrop && scene.textures.exists(config.backdrop)) {
    backdrop = scene.add.image(480, 270, config.backdrop)
      .setDisplaySize(960, 540)
      .setScrollFactor(0)
      .setDepth(2998);
    if (!reduced) {
      backdrop.setScale(backdrop.scaleX * 2.2, backdrop.scaleY * 2.2);
    }
  }

  // Lapisan atmosferik partikel mengambang
  const particles = scene.add.graphics().setScrollFactor(0).setDepth(2998);
  const particleDots: Array<{ x: number; y: number; r: number; vy: number; vx: number; alpha: number }> = [];
  if (!reduced) {
    const partColor = config.caption.includes('1999') ? 0x9be3ff : (config.caption.includes('1968') ? 0xd0e8f2 : 0xf2d6a2);
    for (let i = 0; i < 28; i++) {
      particleDots.push({
        x: Math.random() * 960,
        y: Math.random() * 540,
        r: 1 + Math.random() * 2.5,
        vy: -(0.2 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 0.3,
        alpha: 0.15 + Math.random() * 0.45,
      });
    }
    particles.fillStyle(partColor, 1);
  }

  // Karakter hidup setengah badan / pose sinematik di tengah adegan
  let charVisual: Phaser.GameObjects.Image | undefined;
  const poseKey = config.characterPose || (config.caption.includes('1944') ? 'pose-elena-resolve' : (config.caption.includes('1968') ? 'elena-dialog-sad' : 'elena-dialog'));
  if (scene.textures.exists(poseKey)) {
    charVisual = scene.add.image(480, 540 - 110, poseKey)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(2999)
      .setAlpha(0);
    const targetH = 260;
    charVisual.setScale(targetH / charVisual.height);
  }

  // Top & bottom linear gradient dark vignette
  const vignette = scene.add.graphics().setScrollFactor(0).setDepth(2999);
  vignette.fillGradientStyle(0x040405, 0x040405, 0x040405, 0x040405, 0.88, 0.88, 0, 0);
  vignette.fillRect(0, 0, 960, 180);
  vignette.fillGradientStyle(0x040405, 0x040405, 0x040405, 0x040405, 0, 0, 0.85, 0.85);
  vignette.fillRect(0, 540 - 150, 960, 150);

  const caption = scene.add.text(480, 480, config.caption, {
    color: '#f5f0e8', fontFamily: 'Cinzel, Georgia, serif', fontSize: '16px', fontStyle: 'italic',
    stroke: '#080604', strokeThickness: 4, letterSpacing: 2.5,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

  const track = scene.add.rectangle(375, 508, 210, 3, 0xf5f0e8, 0.2)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(3000);
  const bar = scene.add.rectangle(375, 508, 1, 3, barColor, 1)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(3001);
  const hint = scene.add.text(480, 524, 'ENTER / SPACE / SENTUH UNTUK MELEWATI', {
    color: '#f5f0e899', fontFamily: 'Poppins, sans-serif', fontSize: '10px', letterSpacing: 0.8,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

  const baseScale = backdrop ? backdrop.scaleX / (reduced ? 1 : 2.2) : 1;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    tween.stop();
    scene.input.keyboard?.off('keydown-ENTER', finish);
    scene.input.keyboard?.off('keydown-SPACE', finish);
    scene.input.off('pointerdown', finish);
    vignette.destroy();
    particles.destroy();
    charVisual?.destroy();
    caption.destroy();
    track.destroy();
    bar.destroy();
    hint.destroy();
    backdrop?.destroy();
    camera.setZoom(1);
    config.onComplete();
  };

  const tween = scene.tweens.add({
    targets: progress,
    value: 1,
    duration: reduced ? 250 : config.duration,
    ease: 'Sine.inOut',
    onUpdate: () => {
      const value = progress.value;
      if (!reduced) camera.setZoom(Phaser.Math.Linear(config.startZoom, 1, value));
      camera.centerOn(Phaser.Math.Linear(config.startFocusX, config.endFocusX, value), config.groundY - 120);
      if (backdrop && !reduced) {
        const s = Phaser.Math.Linear(2.2, 1, value) * baseScale;
        backdrop.setScale(s, s);
      }
      bar.width = Math.max(1, 210 * value);

      // Munculkan karakter living atmosphere setelah 35% durasi
      if (charVisual) {
        if (value > 0.35) {
          const charProg = Math.min(1, (value - 0.35) / 0.3);
          charVisual.setAlpha(charProg * 0.95);
          if (!reduced) {
            const bob = Math.sin(scene.time.now * 0.002) * 2;
            charVisual.setY(540 - 110 + bob);
          }
        }
      }

      // Animasi partikel atmosferik
      if (!reduced && particleDots.length) {
        particles.clear();
        const partColor = config.caption.includes('1999') ? 0x9be3ff : (config.caption.includes('1968') ? 0xd0e8f2 : 0xf2d6a2);
        particles.fillStyle(partColor, 1);
        particleDots.forEach(p => {
          p.y += p.vy;
          p.x += p.vx;
          if (p.y < 0) p.y = 540;
          if (p.x < 0) p.x = 960;
          if (p.x > 960) p.x = 0;
          particles.fillCircle(p.x, p.y, p.r);
        });
      }
    },
    onComplete: finish,
  });

  scene.input.keyboard?.on('keydown-ENTER', finish);
  scene.input.keyboard?.on('keydown-SPACE', finish);
  scene.input.on('pointerdown', finish);
}

