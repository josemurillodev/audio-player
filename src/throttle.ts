export function throttle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  let isThrottled = false;
  let savedArgs: Parameters<T> | null = null;
  let savedContext: ThisParameterType<T> | null = null;

  function wrapper(this: ThisParameterType<T>, ...args: Parameters<T>) {
    if (isThrottled) {
      savedArgs = args;
      savedContext = this;
      return;
    }

    isThrottled = true;
    callback.apply(this, args);

    setTimeout(() => {
      isThrottled = false;
      if (savedArgs) {
        wrapper.apply(savedContext, savedArgs);
        savedArgs = null;
        savedContext = null;
      }
    }, delay);
  }

  return wrapper;
}