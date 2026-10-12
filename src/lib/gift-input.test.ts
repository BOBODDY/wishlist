import { describe, expect, it } from 'vitest';
import { parseGiftInput, safeWebURL } from './gift-input';

describe('safeWebURL', () => {
  it('accepts absolute http and https URLs and rejects other schemes or malformed values', () => {
    expect(safeWebURL('https://example.com/item?id=1')).toBe(
      'https://example.com/item?id=1',
    );
    expect(safeWebURL('  http://127.0.0.1:3000/img.png  ')).toBe(
      'http://127.0.0.1:3000/img.png',
    );
    expect(safeWebURL(null)).toBeNull();
    expect(safeWebURL('')).toBeNull();
    expect(safeWebURL('   ')).toBeNull();
    expect(safeWebURL('javascript:alert(1)')).toBeNull();
    expect(safeWebURL('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeWebURL('ftp://example.com/file')).toBeNull();
    expect(safeWebURL('/relative/path')).toBeNull();
    expect(safeWebURL('not a url')).toBeNull();
  });
});

describe('parseGiftInput', () => {
  it('rejects malformed input objects and non-string fields', () => {
    expect(parseGiftInput(null)).toEqual({
      ok: false,
      error: 'Invalid gift data.',
    });
    expect(parseGiftInput('string')).toEqual({
      ok: false,
      error: 'Invalid gift data.',
    });
    expect(parseGiftInput([])).toEqual({
      ok: false,
      error: 'Invalid gift data.',
    });
    expect(
      parseGiftInput({
        name: 'Gift',
        description: '',
        imageURL: '',
        purchaseURL: '',
        estimatedPrice: 25,
      }),
    ).toEqual({
      ok: false,
      error: 'Invalid gift data.',
    });
  });

  it('requires a non-empty trimmed gift name', () => {
    expect(
      parseGiftInput({
        name: '   ',
        description: 'Some description',
        imageURL: '',
        purchaseURL: '',
        estimatedPrice: '',
      }),
    ).toEqual({
      ok: false,
      error: 'Gift name is required.',
    });
  });

  it('normalizes blank optional fields to null and strips unwhitelisted fields', () => {
    const result = parseGiftInput({
      name: '  Cast Iron Skillet  ',
      description: '   ',
      imageURL: '  ',
      purchaseURL: '',
      estimatedPrice: '   ',
      id: 'attacker-id',
      isClaimed: true,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Cast Iron Skillet',
        description: null,
        imageURL: null,
        purchaseURL: null,
        estimatedPrice: null,
      },
    });
  });

  it('validates imageURL and purchaseURL protocols', () => {
    expect(
      parseGiftInput({
        name: 'Book',
        description: '',
        imageURL: 'javascript:alert(1)',
        purchaseURL: '',
        estimatedPrice: '',
      }),
    ).toEqual({
      ok: false,
      error: 'Image URL must use http or https.',
    });

    expect(
      parseGiftInput({
        name: 'Book',
        description: '',
        imageURL: 'https://example.com/cover.jpg',
        purchaseURL: 'javascript:alert(1)',
        estimatedPrice: '',
      }),
    ).toEqual({
      ok: false,
      error: 'Purchase URL must use http or https.',
    });
  });

  it('accepts finite decimal numeric strings and preserves exact trimmed representation', () => {
    for (const validPrice of ['49.95', '10.00', '0', '.5', '-12.5', '1.5e2']) {
      const result = parseGiftInput({
        name: 'Item',
        description: '',
        imageURL: '',
        purchaseURL: '',
        estimatedPrice: `  ${validPrice}  `,
      });
      expect(result).toEqual({
        ok: true,
        value: {
          name: 'Item',
          description: null,
          imageURL: null,
          purchaseURL: null,
          estimatedPrice: validPrice,
        },
      });
    }

    for (const invalidPrice of [
      'abc',
      '$20',
      '0x10',
      '0b10',
      '0o10',
      'Infinity',
      '-Infinity',
      'NaN',
      '1e999',
      '12..3',
      '.',
    ]) {
      const result = parseGiftInput({
        name: 'Item',
        description: '',
        imageURL: '',
        purchaseURL: '',
        estimatedPrice: invalidPrice,
      });
      expect(result).toEqual({
        ok: false,
        error: 'Estimated price must be a number.',
      });
    }
  });
});
