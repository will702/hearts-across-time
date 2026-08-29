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

  let barColor = config.barColor ?? 0xd4a535;
  let defaultBackdrop = config.backdrop;
  let videoKey: string | undefined;
  let partColor = 0xf2d6a2;

  if (config.caption.includes('1944')) {
    barColor = 0xc24a3e;
    defaultBackdrop = defaultBackdrop || (scene.textures.exists('cutscene-arrival-1944') ? 'cutscene-arrival-1944' : undefined);
    videoKey = scene.cache.video.exists('cutscene-video-arrival-1944') ? 'cutscene-video-arrival-1944' : undefined;
    partColor = 0xffc48a;
  } else if (config.caption.includes('1968')) {
    barColor = 0x5d91a9;
    defaultBackdrop = defaultBackdrop || (scene.textures.exists('cutscene-arrival-1968') ? 'cutscene-arrival-1968' : undefined);
    videoKey = scene.cache.video.exists('cutscene-video-arrival-1968') ? 'cutscene-video-arrival-1968' : undefined;
    partColor = 0xd0e8f2;
  } else if (config.caption.includes('1999')) {
    barColor = 0x38bdf8;
    defaultBackdrop = defaultBackdrop || (scene.textures.exists('cutscene-arrival-1999') ? 'cutscene-arrival-1999' : undefined);
    videoKey = scene.cache.video.exists('cutscene-video-arrival-1999') ? 'cutscene-video-arrival-1999' : undefined;
    partColor = 0x9be3ff;
  }

  // Lukisan atau Video sinematik beresolusi tinggi (Ken Burns effect)
  let backdrop: Phaser.GameObjects.Image | undefined;
  let videoObj: Phaser.GameObjects.Video | undefined;

  if (videoKey && !reduced) {
    try {
      videoObj = scene.add.video(480, 270, videoKey)
        .setDisplaySize(960, 540)
        .setScrollFactor(0)
        .setDepth(2998);
      videoObj.play(true);
    } catch {
      videoObj = undefined;
    }
  }

  if (!videoObj && defaultBackdrop && scene.textures.exists(defaultBackdrop)) {
    backdrop = scene.add.image(480, 270, defaultBackdrop)
      .setDisplaySize(960, 540)
      .setScrollFactor(0)
      .setDepth(2998);
    if (!reduced) {
      backdrop.setScale(backdrop.scaleX * 1.12, backdrop.scaleY * 1.12);
    }
  }

  // Partikel atmosferik khusus per era
  const particles = scene.add.graphics().setScrollFactor(0).setDepth(2999);
  const particleDots: Array<{ x: number; y: number; r: number; vy: number; vx: number; alpha: number }> = [];
  if (!reduced) {
    for (let i = 0; i < 34; i++) {
      particleDots.push({
        x: Math.random() * 960,
        y: Math.random() * 540,
        r: 1 + Math.random() * 2.2,
        vy: -(0.25 + Math.random() * 0.5),
        vx: (Math.random() - 0.5) * 0.4,
        alpha: 0.2 + Math.random() * 0.5,
      });
    }
    particles.fillStyle(partColor, 1);
  }

  // Anamorphic 21:9 Cinematic Letterbox Bars
  const letterbox = scene.add.graphics().setScrollFactor(0).setDepth(3000);
  letterbox.fillStyle(0x060504, 0.94);
  letterbox.fillRect(0, 0, 960, 52);
  letterbox.fillRect(0, 540 - 72, 960, 72);
  // Gold dividing line
  letterbox.fillStyle(0xd4a535, 0.5);
  letterbox.fillRect(40, 52, 880, 1.5);
  letterbox.fillRect(40, 540 - 72, 880, 1.5);

  const caption = scene.add.text(480, 488, config.caption, {
    color: '#fbf7ee',
    fontFamily: 'Cinzel, Georgia, serif',
    fontSize: '17px',
    fontStyle: 'bold',
    stroke: '#080604',
    strokeThickness: 3,
    letterSpacing: 2.2,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

  const track = scene.add.rectangle(375, 514, 210, 3, 0xf5f0e8, 0.22)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(3001);
  const bar = scene.add.rectangle(375, 514, 1, 3, barColor, 1)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(3002);
  const hint = scene.add.text(480, 528, 'ENTER / SPACE / SENTUH UNTUK MELEWATI', {
    color: 'rgba(245,240,232,0.65)', fontFamily: 'Poppins, sans-serif', fontSize: '9.5px', letterSpacing: 0.9,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3001);

  const baseScale = backdrop ? backdrop.scaleX / (reduced ? 1 : 1.12) : 1;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    tween.stop();
    scene.input.keyboard?.off('keydown-ENTER', finish);
    scene.input.keyboard?.off('keydown-SPACE', finish);
    scene.input.off('pointerdown', finish);
    letterbox.destroy();
    particles.destroy();
    caption.destroy();
    track.destroy();
    bar.destroy();
    hint.destroy();
    backdrop?.destroy();
    videoObj?.destroy();
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
        const s = Phaser.Math.Linear(1.12, 1.0, value) * baseScale;
        backdrop.setScale(s, s);
      }
      bar.width = Math.max(1, 210 * value);

      // Animasi partikel atmosferik
      if (!reduced && particleDots.length) {
        particles.clear();
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

