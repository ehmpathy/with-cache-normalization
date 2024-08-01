import { DomainEntity, DomainLiteral } from 'domain-objects';

import {
  getCacheReferenceKeyForDomainObject,
  normalizeDomainObjectReferences,
} from './normalizeDomainObjectReferences';

interface Ship {
  // international ship id
  isid: string;

  // name
  name: string;
}
class Ship extends DomainEntity<Ship> implements Ship {
  public static unique = ['isid'];
}

interface Geocode {
  latitude: number;
  longitude: number;
}
class Geocode extends DomainLiteral<Geocode> implements Geocode {}

describe('getCacheReferenceKeyForDomainObject', () => {
  it('should define a good looking key for an example domain entity', () => {
    const ship = new Ship({ isid: '__isid__', name: 'boaty mcboatface' });
    const referenceKey = getCacheReferenceKeyForDomainObject(ship);
    expect(referenceKey).toEqual(
      '.cache.ref.Ship.__isid__.817a221b25b6ae0f426698317a673a8b65e1838960b8375fa2b5fe6ed1927a15',
    );
  });
  it('should define a good looking key for an example domain valueobj', () => {
    const geocode = new Geocode({ latitude: 821, longitude: 1215 });
    const referenceKey = getCacheReferenceKeyForDomainObject(geocode);
    expect(referenceKey).toEqual(
      '.cache.ref.Geocode.821.1215.a1bad264013fe985705f6b5081789da3bcfd8ed7f5e8f425dfdd8bcc44e55cf9',
    );
  });
});
describe('normalizeDomainObjectReferences', () => {
  it('should replace domain object value with reference', () => {
    const ship = new Ship({ isid: '__isid__', name: 'boaty mcboatface' });
    const { value: normalized, references } = normalizeDomainObjectReferences({
      value: ship,
    });
    const expectedReferenceKey = getCacheReferenceKeyForDomainObject(ship);
    expect(normalized).toEqual(expectedReferenceKey);
    expect(references).toEqual({ [expectedReferenceKey]: ship });
  });
  it('should replace domain objects nested in value with references', () => {
    const ship = new Ship({ isid: '__isid__', name: 'boaty mcboatface' });
    const { value: normalized, references } = normalizeDomainObjectReferences({
      value: { ship, color: 'blue' },
    });
    const expectedReferenceKey = getCacheReferenceKeyForDomainObject(ship);
    expect(normalized).toEqual({ ship: expectedReferenceKey, color: 'blue' });
    expect(references).toEqual({ [expectedReferenceKey]: ship });
  });
  it('should replace domain objects deeply nested in value with references', () => {
    const ship = new Ship({ isid: '__isid__', name: 'boaty mcboatface' });
    const geocode = new Geocode({ latitude: 821, longitude: 1215 });
    const { value: normalized, references } = normalizeDomainObjectReferences({
      value: { ship, color: 'blue', position: { geocode } },
    });
    const expectedReferenceKeyForShip =
      getCacheReferenceKeyForDomainObject(ship);
    const expectedReferenceKeyForGeocode =
      getCacheReferenceKeyForDomainObject(geocode);
    expect(normalized).toEqual({
      ship: expectedReferenceKeyForShip,
      color: 'blue',
      position: { geocode: expectedReferenceKeyForGeocode },
    });
    expect(references).toEqual({
      [expectedReferenceKeyForShip]: ship,
      [expectedReferenceKeyForGeocode]: geocode,
    });
  });
  it('should preserve the shape of arrays', () => {
    const value = ['a', 'b', 'c'];
    const { value: normalized } = normalizeDomainObjectReferences({
      value,
    });
    expect(normalized).toEqual(value);
  });
});
