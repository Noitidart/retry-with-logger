# retry-with-logger

`npm i retry-with-logger`

See `example/index.js` to see a bit more useful usage.

## Quick Start (Basic Usage)

```typescript
import retry from 'retry-with-logger';

try {
  const result = await retry(() => {
    throw new Error('boo');
  });
} catch (error) {
  console.log('final error:', error);
}
```

This will try running the function once, then if it fails it will retry default of 5 times.
