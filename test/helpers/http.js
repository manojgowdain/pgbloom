/**
 * HTTP client helper for integration tests.
 * Wraps native fetch with JSON support and sensible error reporting.
 */

export async function request(baseUrl, method, path, body, options = {}) {
  const url = `${baseUrl}${path}`;
  const init = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  };
  if (body !== undefined && body !== null) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    text,
    json,
  };
}

export const get = (base, path, options) => request(base, "GET", path, null, options);
export const post = (base, path, body, options) => request(base, "POST", path, body, options);
export const del = (base, path, body, options) => request(base, "DELETE", path, body, options);
export const head = (base, path, options) => request(base, "HEAD", path, null, options);
export const put = (base, path, body, options) => request(base, "PUT", path, body, options);

export async function fetchRaw(url, init) {
  return fetch(url, init);
}
