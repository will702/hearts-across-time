import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('bahasa visual game', () => {
  it('tidak memakai emoji sebagai elemen antarmuka', () => {
    const root = join(process.cwd(), 'src', 'game');
    const files = readdirSync(root, { recursive: true })
      .filter((file): file is string => typeof file === 'string' && file.endsWith('.ts'));
    const offenders = files.filter(file => /\p{Extended_Pictographic}/u.test(readFileSync(join(root, file), 'utf8')));

    expect(offenders).toEqual([]);
  });
});
