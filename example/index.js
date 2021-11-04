const { retry } = require('retry-with-logger');

function myRetry(proc, method, options = {}) {
  return retry(method, {
    ...options,
    extraLogData: {
      ...options.extraLogData,
      proc
    },
    logger: {
      info: logData => {
        console.info(
          'INFO:',
          `${proc} needed more retries than acceptable to succeed`,
          logData
        );
      },
      warn: (error, logData) => {
        console.warn('WARN:', error.message, logData);
      },
      error: (error, logData) => {
        // terminal errors are errors i know about for sure, i dont want to log this
        if (logData.terminal) {
          return;
        }

        console.error('ERROR:', error.message, logData);
      }
    }
  });
}

async function main() {
  let errorNumber = 0;
  const didSayHello = await myRetry(
    'sayHello',
    () => {
      if (errorNumber < 3) {
        throw new Error('errorNumber: ' + errorNumber++);
      }
      console.log('hello');
      return true;
    },
    { exponentialBackoff: true, interval: 1000 }
  );

  console.log('didSayHello:', didSayHello);
}

main();
