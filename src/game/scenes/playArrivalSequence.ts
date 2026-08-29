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

  // lukisan intro era: kamera besar lalu mundur (keyframe legacy)
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

  // Top linear gradient dark vignette
  const topGrad = scene.add.graphics().setScrollFactor(0).setDepth(2999);
  topGrad.fillGradientStyle(0x040405, 0x040405, 0x040405, 0x040405, 0.85, 0.85, 0, 0);
  topGrad.fillRect(0, 0, 960, 190);

  const caption = scene.add.text(480, 490, config.caption, {
    color: '#f5f0e8', fontFamily: 'Cinzel, Georgia, serif', fontSize: '15px', fontStyle: 'italic',
    stroke: '#080604', strokeThickness: 4, letterSpacing: 2,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

  const track = scene.add.rectangle(375, 514, 210, 3, 0xf5f0e8, 0.2)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(3000);
  const bar = scene.add.rectangle(375, 514, 1, 3, barColor, 1)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(3001);
  const hint = scene.add.text(480, 526, 'ENTER / SPACE / SENTUH UNTUK MELEWATI', {
    color: '#f5f0e899', fontFamily: 'Poppins, sans-serif', fontSize: '10px', letterSpacing: 0.5,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

  const baseScale = backdrop ? backdrop.scaleX / (reduced ? 1 : 2.2) : 1;

  const finish = (): void => {
    if (finished) return;
    finished = true;
    tween.stop();
    scene.input.keyboard?.off('keydown-ENTER', finish);
    scene.input.keyboard?.off('keydown-SPACE', finish);
    scene.input.off('pointerdown', finish);
    topGrad.destroy();
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
    },
    onComplete: finish,
  });
  scene.input.keyboard?.on('keydown-ENTER', finish);
  scene.input.keyboard?.on('keydown-SPACE', finish);
  scene.input.on('pointerdown', finish);
}
