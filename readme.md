# with-cache-normalization

🗜️ normalize your cache -> get automatic cache updates ✨

# install

```sh
npm install with-cache-normalization
```

# use

lets say you're starting with a cache that stores references to ships

without normalization, it will operate something like this
```ts
const value = {
  ships: [
    new Ship({ id: 1, name: 'boaty mcboatface' }),
    new Ship({ id: 2, name: 'sea biscuit' }),
    new Ship({ id: 1, name: 'boaty mcboatface' })
  ],
};
cache.set('__key__', value);
expect(cache.get('__key__')).toEqual(value) // true, like we would expect
```

and the cache store would now contain something like this
```ts
{
  '__key__': {
    ships: [
      new Ship({ id: 1, name: 'boaty mcboatface' }),
      new Ship({ id: 2, name: 'sea biscuit' }),
      new Ship({ id: 1, name: 'boaty mcboatface' }
    ]
  }
}
```


### 🗜️ add normalization to a cache

we can leverage normalization to reference those ships via foreign key, like in a relational database

with normalization, it will operate like this
```ts
import { withNormalization, normalizeDomainObjectReferences } from 'with-cache-normalization';

const value = {
  ships: [
    new Ship({ id: 1, name: 'boaty mcboatface' }),
    new Ship({ id: 2, name: 'sea biscuit' }),
    new Ship({ id: 1, name: 'boaty mcboatface' })
  ],
};
const cacheWithNormalization = withNormalization(
  cache,
  {
    normalize: normalizeDomainObjectReferences,
  }
)
cacheWithNormalization.set('__key__', value);
expect(cacheWithNormalization.get('__key__')).toEqual(value) // still true, as the .get automatically denormalizes the results
```

and the cache store would now contain something like this
```ts
 {
   '__key__': {
     ships: [
       '.cache.ref.Ship.1',
       '.cache.ref.Ship.2',
       '.cache.ref.Ship.1',
     ]
   },
  '.cache.ref.Ship.1}': new Ship({ id: 1, name: 'boaty mcboatface' ),
  '.cache.ref.Ship.2}': new Ship({ id: 2, name: 'sea biscuit' )
 }
```


this provides the following advantages
- 🗜️ smaller cache size: when the same entities are referenced more than once, only the reference is duplicated
- ✨ automatic cache updates: when any `cache.set` updates the same referenced entity, all will dereference the latest value

*note: the `normalizeDomainObjectReferences` method comes out of the box with this library, since [domain-object](https://github.com/ehmpathy/domain-objects) normalization is a common usecase*


### 🎈 add only denormalization to a cache

you may find a scenario where you want to denormalize values from a cache that you are not writing to (e.g., [with-cache-normalization](https://github.com/ehmpathy/with-cache-normalization))

in this scenario, you likely wont have access to the method used to normalize the values

not a problem, you can denormalize entries in the cache without needing to know this method

for example, lets say you're accessing the same cache state as with the normalized ships from above
```ts
const cacheWithDenormalization = withNormalization(cache)
cacheWithDenormalization.get('__key__');
```

the above would return the fully hydrated, denormalized value
```ts
{
  ships: [
    new Ship({ id: 1, name: 'boaty mcboatface' }),
    new Ship({ id: 2, name: 'sea biscuit' }),
    new Ship({ id: 1, name: 'boaty mcboatface' })
  ],
};
```

### 🌀 add serialization to a string only cache

a common situation you may find yourself in is attempting to add normalization to a cache which only accepts strings

since normalization requires object input in order to recursively traverse the data you're attempting to cache, it can't operate directly on a cache that only accepts strings

to solve for this, simply add serialization to the cache with the `withSerialization` utility

for example
```ts
const ship = new Ship({ id: 3, name: 'nacho boat' })

// lets say your original cache only accepts strings
cache.set('__key__', ship) // 🚫 type error

// easily add serialization
const cacheWithSerialization = withSerialization(cache) // defaults to JSON.stringify + JSON.parse

// now, you can write any data to this cache
cacheWithSerialization.set('__key__', ship) // ✅ serialized when setting

// and, when you read it, it will be deserialized
const cached = cacheWithSerialization.get('__key__')
expect(cached).toEqual(ship) // ✅ deserialized when getting
```
