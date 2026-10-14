import { describe, expect, it } from 'vitest';
import { parseGiftInput, safeWebURL } from './gift-input';

const validInput = {
  name: 'Gift',
  description: '',
  imageURL: '',
  purchaseURL: '',
  estimatedPrice: '',
  isClaimable: false,
};

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
  it.each([null, 'string', [], {}])('rejects malformed input %j', (input) => {
    expect(parseGiftInput(input).ok).toBe(false);
  });

  it.each(['name', 'description', 'imageURL', 'purchaseURL', 'estimatedPrice'])(
    'rejects non-string %s',
    (field) => {
      expect(parseGiftInput({ ...validInput, [field]: 25 }).ok).toBe(false);
    },
  );

  it.each([undefined, null, 'true', 'false', 'on', '', 0, 1, [], {}])(
    'rejects a non-boolean claimable flag %j',
    (isClaimable) => {
      expect(parseGiftInput({ ...validInput, isClaimable }).ok).toBe(false);
    },
  );

  it('requires the claimable flag even when all text fields are present', () => {
    const withoutFlag: Partial<typeof validInput> = { ...validInput };
    delete withoutFlag.isClaimable;
    expect(parseGiftInput(withoutFlag).ok).toBe(false);
  });

  it.each([false, true])('preserves the boolean claimable flag %s', (isClaimable) => {
    const result = parseGiftInput({ ...validInput, isClaimable });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.isClaimable).toBe(isClaimable);
  });

  it('requires a non-empty trimmed gift name', () => {
    expect(parseGiftInput({ ...validInput, name: '   ' }).ok).toBe(false);
  });

  it('normalizes blank optional fields to null and strips unwhitelisted fields', () => {
    const result = parseGiftInput({
      ...validInput,
      name: '  Cast Iron Skillet  ',
      description: '   ',
      imageURL: '  ',
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
        isClaimable: false,
      },
    });
  });

  it.each(['imageURL', 'purchaseURL'])('rejects unsafe %s protocols', (field) => {
    expect(
      parseGiftInput({ ...validInput, [field]: 'javascript:alert(1)' }).ok,
    ).toBe(false);
  });

  it('accepts finite decimal numeric strings and preserves exact trimmed representation', () => {
    for (const validPrice of ['49.95', '10.00', '0', '.5', '-12.5', '1.5e2']) {
      const result = parseGiftInput({
        ...validInput,
        estimatedPrice: `  ${validPrice}  `,
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.estimatedPrice).toBe(validPrice);
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
      expect(
        parseGiftInput({ ...validInput, estimatedPrice: invalidPrice }).ok,
      ).toBe(false);
    }
  });
});
