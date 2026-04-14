export const toCamelCase = (value) =>
  value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

export const mapRow = (row) =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [toCamelCase(key), value]));

export const safeJsonParse = (value, fallback = null) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

