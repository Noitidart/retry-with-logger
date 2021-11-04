const { default: retry } = require('retry-with-logger');

function myRetry(proc, method, options = {}) {
  return retry(method, {
    ...options,
    extraLogData: {
      ...options.extraLogData,
      proc
    },
    logger: {
      info: logData => {
        // plain
        console.info(
          'INFO:',
          `${proc} needed more retries than acceptable to succeed`,
          logData
        );
        // // mobile
        // const { retryCount, maxRetryCount, retryBatchId, proc, ...extras } =
        //   logData;
        // captureSentry(
        //   `${proc} needed more retries than acceptable to succeed`,
        //   proc,
        //   {
        //     extras,
        //     tags: { proc, retryCount, retryCountMax, retryBatchId }
        //   }
        // );

        // // web
        // sails.log.info({
        //   ...logData,
        //   message: `${proc} needed more retries than acceptable to succeed`
        // });
      },
      warn: (error, logData) => {
        // plain
        console.warn('WARN:', error.message, logData);

        // // mobile
        // const { retryCount, maxRetryCount, retryBatchId, proc, ...extras } =
        //   logData;
        // captureSentry(error, logData.proc, {
        //   // this will make sentry set level to warning.
        //   isHandledError: true,

        //   extras,
        //   tags: { proc, retryCount, retryCountMax, retryBatchId }
        // });

        // // web
        // sails.log.warn({
        //   error,
        //   ...logData
        // });
      },
      error: (error, logData) => {
        // terminal errors are errors i know about for sure, i dont want to log this
        if (logData.terminal) {
          return;
        }

        // plain
        console.error('ERROR:', error.message, logData);

        // // mobile
        // const { retryCount, retryCountMax, retryBatchId, proc, ...extras } =
        //   logData;
        // captureSentry(error, logData.proc, {
        //   extras,
        //   tags: { proc, retryCount, retryBatchId, retryCountMax }
        // });

        // // web
        // sails.log.error({
        //   error,
        //   ...logData
        // });
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
