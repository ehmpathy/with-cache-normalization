import { SimpleAsyncCache } from 'with-simple-cache';

import { withSerialization } from './withSerialization';

describe('withSerialization', () => {
  const exampleStore: Record<string, any> = {};
  const cacheGetMock = jest.fn((key) => exampleStore[key]);
  const cacheSetMock = jest.fn((key, value) => (exampleStore[key] = value));
  const cache: SimpleAsyncCache<string> = {
    get: cacheGetMock,
    set: cacheSetMock,
  };
  const cacheWithSerialization = withSerialization(cache);

  it('should serialize values on set', async () => {
    await cacheWithSerialization.set('__key__', { hello: 'world' });
    expect(cacheSetMock).toHaveBeenCalledWith(
      '__key__',
      '{"hello":"world"}',
      undefined,
    );
  });

  it('should deserialize values on get', async () => {
    const result = await cacheWithSerialization.get('__key__');
    expect(result).toEqual({ hello: 'world' });
  });
});
