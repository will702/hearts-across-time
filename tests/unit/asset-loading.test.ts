import { describe, expect, it } from 'vitest';
import {
  ASSET_PACKS,
  AUDIO_ASSETS,
  BONUS_IMAGE_ASSETS,
  BONUS_PROP_SHEET_ASSETS,
  CHARACTER_SHEET_ASSETS,
  IMAGE_ASSETS,
  PROP_SHEET_ASSETS,
  type AssetPack,
} from '../../src/game/assetManifest';

describe('asset loading packs', () => {
  it('keeps startup minimal and assigns every production asset', () => {
    expect(ASSET_PACKS.startup).toEqual({
      images: ['title-cover', 'title-bg-color', 'title-bg-mono', 'title-wordmark'],
    });

    const packs = Object.values(ASSET_PACKS) as AssetPack[];
    const assigned = (field: keyof AssetPack) => new Set(packs.flatMap(pack => pack[field] ?? []));

    expect(assigned('images')).toEqual(new Set([
      ...Object.keys(IMAGE_ASSETS),
      ...Object.keys(BONUS_IMAGE_ASSETS),
    ]));
    expect(assigned('propSheets')).toEqual(new Set([
      ...Object.keys(PROP_SHEET_ASSETS),
      ...Object.keys(BONUS_PROP_SHEET_ASSETS),
    ]));
    expect(assigned('characterSheets')).toEqual(new Set(Object.keys(CHARACTER_SHEET_ASSETS)));
    expect(assigned('audio')).toEqual(new Set(Object.keys(AUDIO_ASSETS)));
  });
});
