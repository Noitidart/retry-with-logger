import { v4 as uuidv4 } from 'uuid';

type LogData = {
  retryCountMax: number;
  retryCount: number;
  retryBatchId: string;
};

type IsTerminalError = (error: Error) => boolean;

interface IRetryOptions<ExtraLogData extends {}> {
  // default - 5
  maxRetryCount?: number;

  // default - 200
  // milliseconds
  interval?: number;

  // will multiply interval by exponential factor of Math.pow(2, retryCount)
  exponentialBackoff?: boolean;

  // isTerminalError is a function that should return
  // false/true - it receives one arg, the error that was
  // just caught. its meant for saying this is a
  // terminal error, do not retry it, we know for sure it
  // will keep failing.
  // default - void
  isTerminalError?: IsTerminalError;

  // default - 0. if less than this many retries, it will not logger.warn the
  // error when another retry will be made.
  //
  // default of 0 means not a single retry is acceptable, and every error that
  // will be retried should be logged. after this many retries, then every retry
  // logs to with warning. this is useful for situations where you know you
  // sometimes HAVE to retry 1 times. so acceptable retry here  1 (first attempt
  // made but failed, 1 retry happened and succeeded).
  acceptableRetryCount?: number;

  logger?: {
    // triggers when more than options.acceptableRetryCount were needed to succeed
    info: (
      logData: LogData & ExtraLogData & { retryCountAcceptable: number }
    ) => void;

    // warn triggers when error happens, but a retry will happen
    warn: (error: Error, logData: LogData & ExtraLogData) => void;

    // error triggers when error happens, and no more retries remain.
    error: (
      error: Error,
      logData: LogData &
        ExtraLogData & { terminal: ReturnType<IsTerminalError> }
    ) => void;
  };
  extraLogData?: ExtraLogData;
}

// https://www.jpwilliams.dev/how-to-unpack-the-return-type-of-a-promise-in-typescript
type AsyncReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => Promise<infer U>
  ? U
  : T extends (...args: any) => infer U
  ? U
  : any;

// captures error to sentry every time error happens, even final time.
// rejects with error if max retries reached
// resolves with value of method if succeeds
export default async function retry<T extends () => any>(
  method: T,
  options: IRetryOptions<{}> = {}
): Promise<AsyncReturnType<T>> {
  const retryCountMax =
    options.maxRetryCount === undefined ? 5 : options.maxRetryCount;
  const intervalMillis =
    options.interval === undefined ? 200 : options.interval;
  const acceptableRetryCount =
    options.acceptableRetryCount === undefined
      ? 0
      : options.acceptableRetryCount;

  const retryBatchId = uuidv4();

  for (let retryCount = 0; retryCount <= retryCountMax; retryCount++) {
    const logData = {
      ...options.extraLogData,
      retryCount,
      retryCountMax,
      retryBatchId
    };

    // first iteration, when retryCount === 0, is not considered a retry
    // after that will try maxRetryCount times (if its 5, then 0th is try
    // and enxt 5 times is retries for total trys of 6 trys)
    try {
      const value = await method();

      if (retryCount > acceptableRetryCount && options.logger) {
        options.logger.info({
          ...logData,
          retryCountAcceptable: acceptableRetryCount
        });
      }

      return value;
    } catch (error) {
      const hasRetriedMaxTimes = retryCount === retryCountMax;
      const terminal = options.isTerminalError
        ? options.isTerminalError(error)
        : false;

      const willRetry = !hasRetriedMaxTimes && !terminal;

      if (
        options.logger &&
        (retryCount >= acceptableRetryCount || !willRetry)
      ) {
        if (!willRetry) {
          options.logger.error(error, {
            ...logData,
            terminal
          });
        } else {
          options.logger.warn(error, logData);
        }
      }

      if (!willRetry) {
        throw error;
      } else {
        let delayMs = intervalMillis;
        if (options.exponentialBackoff) {
          delayMs = delayMs * Math.pow(2, retryCount);
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error('should never get here');
}
