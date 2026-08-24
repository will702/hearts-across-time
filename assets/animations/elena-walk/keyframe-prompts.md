# Siklus Jalan Elena — Kunci Identitas dan Prompt Keyframe

## Baseline

- Sumber produksi: frame 1 (`150x210`) dari `assets/elena_sheet.png`, menghadap ke kanan layar.
- Baseline generasi: frame tersebut dipotong tanpa perubahan pose, lalu distandardisasi menjadi kanvas transparan `690x900`; subjek setinggi `360px` dengan margin `270px`.
- Identitas: Elena adalah perempuan muda bergaya ilustrasi anime-watercolor storybook. Rambut pirang abu hangat sebahu dengan poni menyamping dan ujung bergelombang; kulit pucat; mata abu-cokelat; ekspresi netral lembut.
- Busana: mantel putih gading berlengan lebar, gaun A-line merah mawar kusam selutut, kaus kaki krem dengan pita cokelat, dan sepasang sepatu bot gading dengan strap/sol cokelat.
- Gaya: garis sketsa tipis warna taupe, tekstur cat air lembut, bayangan halus, proporsi chibi yang sama, tanpa bayangan lantai dan tanpa efek gerak.

## Kunci topologi

- Ruang koordinat: layar (`screen-space`); Elena selalu menghadap ke kanan layar dan tidak pernah dicerminkan.
- Kaki kanan-layar memimpin pada frame 00 dan tetap terhubung ke pinggul kanan-layar; kaki kiri-layar mulai sebagai kaki belakang, kemudian memimpin pada kontak berlawanan tanpa bertukar akar pinggul.
- Lengan kanan-layar selalu terhubung ke bahu kanan-layar; lengan kiri-layar selalu terhubung ke bahu kiri-layar. Keduanya hanya melakukan ayunan balasan kecil.
- `activeWeapon`: tidak ada. `carriedProp`: tidak ada. `detachedProp`: tidak ada.
- `passiveAccessory`: rambut, ujung mantel, dan kelim gaun mengikuti torso dengan drag kecil; tidak boleh terlepas, berlipat ganda, atau berubah desain.
- Warna kunci: hijau murni `#00FF00`, karena tidak terdapat pada palet Elena dan tidak memotong gaun merah mawar.

## Prompt bersama

```text
Use case: identity-preserve.
Asset type: production 2D game walk-cycle key-pose sheet.
Input image 1 is the exact visual identity and scale source. Input image 2 is the complete existing production character sheet for outfit, face, watercolor style, and walking continuity. Use them as strict references, not loose inspiration.

Create exactly four separate full-body sprites in a clean 2x2 grid, reading order frame 02, frame 05, frame 08, frame 11. Every slot has the same dimensions, the same apparent character size, the same fixed foot/bottom baseline, large empty gutters, and a green-screen #00FF00 background. No labels, numbers, dividers, borders, shadows, floor, dust, motion lines, or detached effects. No overlap and no neighboring fragments.

Preserve Elena's exact identity: young woman, warm ash-blonde shoulder-length wavy hair and side-swept bangs, pale skin, soft gray-brown eyes, neutral gentle expression, ivory-white wide-sleeved coat, muted dusty-rose knee-length A-line dress, cream socks with brown bands, ivory ankle boots with brown straps and soles, thin taupe sketch outline, subtle translucent watercolor shading, identical chibi proportions and silhouette language. Preserve body-part count, face, eyes, hair shape, garment construction, boot design, palette, outline weight, and texture. Only change pose, weight transfer, limb angles, subtle vertical bob, cloth/hair drag, and animation timing. Do not redesign, simplify, beautify, add details, remove details, change proportions, reinterpret, or mirror Elena.

Coordinate space is screen-space. Elena faces screen-right in all four sprites. The screen-right leg always stays connected to the screen-right hip and the screen-left leg always stays connected to the screen-left hip, even when either leg crosses the torso centerline. The screen-right arm always stays connected to the screen-right shoulder; the screen-left arm always stays connected to the screen-left shoulder. Do not swap, duplicate, hide, or merge limbs. Both hands remain empty. Hair, coat hems, and dress hem are passive accessories attached to their original surfaces and show only gentle secondary drag.

The source baseline is frame 00/13: screen-right leg leads forward in contact while the screen-left leg trails. Build one seamless, grounded walk cycle with clear alternating feet, stable body mass, small natural bob, restrained arm counter-swing, and no sliding feet.
```

## Frame 02 — turun setelah kontak kanan-layar

```text
Frame 02, down pose immediately after the source contact: the screen-right boot is planted forward and bears the weight; its knee bends slightly. The screen-left leg trails with heel lifted and toe finishing push-off. Elena's center of mass lowers subtly, torso remains nearly upright with a slight forward travel lean, head stays level and looking screen-right. Arms counter-swing gently while preserving their shoulder roots. This continues from frame 00 toward the passing pose at frame 05.
```

## Frame 05 — passing/up menuju langkah kiri-layar

```text
Frame 05, passing/up pose: the screen-left leg swings forward beneath the torso with a softly bent knee while the screen-right support leg straightens and begins to trail. The body reaches the highest point of the cycle without changing apparent size. The screen-left boot clears the ground visibly; the screen-right boot keeps credible toe contact. Coat, dress, and hair lag a few pixels behind the forward motion. Continue toward the opposite contact at frame 08.
```

## Frame 08 — kontak berlawanan kiri-layar

```text
Frame 08, opposite contact: the screen-left heel reaches forward and touches the ground; the screen-right leg extends behind with the toe at the end of push-off. Use the clearest alternating-foot silhouette in the sheet. Keep the pelvis centered, the foot baseline fixed, and the torso stable with only a tiny forward lean. Arm counter-swing is opposite the legs and restrained. This must read as the same Elena, not a variant.
```

## Frame 11 — passing/up kembali ke baseline

```text
Frame 11, second passing/up pose on the return half: weight transfers over the screen-left support leg while the screen-right leg swings forward under the torso toward the original source contact. The screen-right knee bends and boot clears the ground; the screen-left leg begins to trail. Body is subtly high, head remains steady, and passive hair/coat/dress drag reverses naturally. The next generated in-between must lead cleanly back to the exact source pixels at frame 13.
```
