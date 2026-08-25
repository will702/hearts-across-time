import Phaser from 'phaser';

type ArrivalConfig = {
  caption: string;
  duration: number;
  startZoom: number;
  startFocusX: number;
  endFocusX: number;
  groundY: number;
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

  const caption = scene.add.text(480, 490, config.caption, {
    color: '#f5f0e8', fontFamily: 'Cinzel, serif', fontSize: '14px', fontStyle: 'italic',
    stroke: '#080604', strokeThickness: 4,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);
  const track = scene.add.rectangle(375, 514, 210, 3, 0xf5f0e8, 0.2)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(3000);
  const bar = scene.add.rectangle(375, 514, 1, 3, 0xa85550, 1)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(3001);
  const hint = scene.add.text(480, 526, 'ENTER / SPACE / SENTUH UNTUK MELEWATI', {
    color: '#f5f0e899', fontFamily: 'Poppins, sans-serif', fontSize: '10px',
  }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);

  const finish = (): void => {
    if (finished) return;
    finished = true;
    tween.stop();
    scene.input.keyboard?.off('keydown-ENTER', finish);
    scene.input.keyboard?.off('keydown-SPACE', finish);
    scene.input.off('pointerdown', finish);
    caption.destroy();
    track.destroy();
    bar.destroy();
    hint.destroy();
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
      bar.width = Math.max(1, 210 * value);
    },
    onComplete: finish,
  });
  scene.input.keyboard?.on('keydown-ENTER', finish);
  scene.input.keyboard?.on('keydown-SPACE', finish);
  scene.input.on('pointerdown', finish);
}
