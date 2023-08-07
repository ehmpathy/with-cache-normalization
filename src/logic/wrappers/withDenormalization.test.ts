import { SimpleAsyncCache } from 'with-simple-caching';

import { SerializableObject } from '../../domain/NormalizeCacheValueMethod';
import { withDenormalization } from './withDenormalization';

describe('withDenormalization', () => {
  const exampleStore: Record<string, any> = {};
  const cacheGetMock = jest.fn((key) => exampleStore[key]);
  const cacheSetMock = jest.fn((key, value) => (exampleStore[key] = value));
  const cache: SimpleAsyncCache<SerializableObject> = {
    get: cacheGetMock,
    set: cacheSetMock,
  };
  const cacheWithDenormalization = withDenormalization(cache);
  it('should be able to denormalize a cached value equal to a reference', async () => {
    // set the reference
    await cache.set('.cache.ref.Ship.1', '__SHIP__');

    // set an item which uses the reference
    await cache.set('__key__', '.cache.ref.Ship.1');

    // lookup the item with denormalization
    const found = await cacheWithDenormalization.get('__key__');

    // prove that it was denormalized successfully
    expect(found).toEqual('__SHIP__');
  });
  it('should be able to denormalize a cached value with nested references', async () => {
    // set the reference
    await cache.set('.cache.ref.Ship.1', '__SHIP__');

    // set an item which uses the reference
    await cache.set('__key__', { ship: '.cache.ref.Ship.1', color: 'green' });

    // lookup the item with denormalization
    const found = await cacheWithDenormalization.get('__key__');

    // prove that it was denormalized successfully
    expect(found).toEqual({ ship: '__SHIP__', color: 'green' });
  });
  it('should be able to denormalize a cached value with deeply nested references', async () => {
    // set the reference
    await cache.set('.cache.ref.Ship.1', '__SHIP__');
    await cache.set('.cache.ref.Geocode.3', '__GEOCODE__');

    // set an item which uses the reference
    await cache.set('__key__', {
      ship: '.cache.ref.Ship.1',
      color: 'green',
      position: { geocode: '.cache.ref.Geocode.3' },
    });

    // lookup the item with denormalization
    const found = await cacheWithDenormalization.get('__key__');

    // prove that it was denormalized successfully
    expect(found).toEqual({
      ship: '__SHIP__',
      color: 'green',
      position: { geocode: '__GEOCODE__' },
    });
  });
  it('should preserve the shape of arrays', async () => {
    // set an item which contains an array
    await cache.set('__key__', { colors: ['green', 'blue'] });

    // lookup the item with denormalization
    const found = await cacheWithDenormalization.get('__key__');

    // prove that it was denormalized successfully
    expect(found).toEqual({ colors: ['green', 'blue'] });
  });
});
