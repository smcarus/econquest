import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'crypto';
import { sha256Hex } from '../src/engine/sha256';

const node = (x: string | Uint8Array) => createHash('sha256').update(x).digest('hex');

test('known SHA-256 answers', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'), '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
});

test('matches Node for every length around the block edges, Unicode text and random bytes', () => {
  for (let n = 0; n < 200; n += 1) assert.equal(sha256Hex('x'.repeat(n)), node('x'.repeat(n)), `length ${n}`);
  for (const s of ['é', '日本語 text', '€ 1,5 Mrd. — “quotes”', '🙂 emoji', '{"seq":1,"prev":"GENESIS"}']) assert.equal(sha256Hex(s), node(s));
  for (let i = 0; i < 50; i += 1) {
    const bytes = new Uint8Array(randomBytes(1 + Math.floor(Math.random() * 3000)));
    assert.equal(sha256Hex(bytes), node(bytes));
  }
  const big = 'a'.repeat(1_000_000);
  assert.equal(sha256Hex(big), node(big));
});
