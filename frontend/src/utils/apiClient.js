import { apiUrl } from '../config/api';

export async function apiFetch(path, options) {
  const response = await fetch(apiUrl(path), options);
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }
    return data;
  }

  const text = await response.text();
  const shortText = text.replace(/\s+/g, ' ').slice(0, 120);
  throw new Error(
    `API returned non-JSON response from ${apiUrl(path)}. Check VITE_API_BASE_URL. Response: ${shortText}`
  );
}
