import { test, expect, describe } from 'vitest';
import { normalizeURL } from '../crawler.ts';

describe('Testing normalizeURL', () => {
  test('Should return without trailing slash', () => {
    const url = normalizeURL('https://macandersonuche.dev/');

    expect(url).toEqual('macandersonuche.dev');
  });
  test('Should return with pathname', () => {
    const url = normalizeURL('https://macandersonuche.dev/home');

    expect(url).toEqual('macandersonuche.dev/home');
  });
});
