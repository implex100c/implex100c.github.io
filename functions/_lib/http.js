export function json(data, init = 200) {
  const responseInit = typeof init === 'number'
    ? { status: init }
    : { ...init };

  return new Response(JSON.stringify(data), {
    ...responseInit,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(responseInit.headers || {})
    }
  });
}
