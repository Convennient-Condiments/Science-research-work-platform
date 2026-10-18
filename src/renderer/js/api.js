window.api = (() => {
  async function call(fn, ...args) {
    try {
      return await window.phd[fn](...args);
    } catch (err) {
      console.error(`[api] ${fn}`, err);
      if (window.toast) window.toast('error', err.message || '操作失败');
      throw err;
    }
  }
  const wrapper = {};
  for (const key of Object.keys(window.phd || {})) {
    wrapper[key] = (...args) => call(key, ...args);
  }
  return wrapper;
})();
