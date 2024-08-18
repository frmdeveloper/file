export function load(url, context, nextLoad) {
  if (url.startsWith('https://')) {
    return new Promise(async(resolve, reject) => {
      const p = await fetch(url)
      resolve({
          format: 'module',
          shortCircuit: true,
          source: await p.text(),
      })
    });
  }
  return nextLoad(url);
}
