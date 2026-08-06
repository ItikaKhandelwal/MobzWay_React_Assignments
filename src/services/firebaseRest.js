const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

export const isFirebaseConfigured = Boolean(apiKey && projectId);

const authBase = 'https://identitytoolkit.googleapis.com/v1/accounts';
const firestoreBase = projectId
  ? `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
  : '';

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firebaseMessage = payload?.error?.message?.replaceAll('_', ' ');
    throw new Error(firebaseMessage || 'Firebase request failed.');
  }
  return payload;
}

async function authenticate(action, email, password) {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured.');

  const response = await fetch(`${authBase}:${action}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  return parseResponse(response);
}

export function firebaseSignUp(email, password) {
  return authenticate('signUp', email, password);
}

export function firebaseLogin(email, password) {
  return authenticate('signInWithPassword', email, password);
}

function encodeValue(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };

  switch (typeof value) {
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case 'object':
      return { mapValue: { fields: encodeFields(value) } };
    default:
      return { stringValue: String(value) };
  }
}

function encodeFields(object) {
  return Object.fromEntries(
    Object.entries(object)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeValue(value)]),
  );
}

function decodeValue(value = {}) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  return undefined;
}

function decodeFields(fields) {
  return Object.fromEntries(
    Object.entries(fields ?? {}).map(([key, value]) => [key, decodeValue(value)]),
  );
}

export async function saveFirebaseDocument(collection, documentId, data, idToken) {
  const response = await fetch(
    `${firestoreBase}/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fields: encodeFields(data) }),
    },
  );

  const payload = await parseResponse(response);
  return { id: documentId, ...decodeFields(payload.fields) };
}

export async function getFirebaseDocument(collection, documentId, idToken) {
  const response = await fetch(
    `${firestoreBase}/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } },
  );

  const payload = await parseResponse(response);
  return { id: documentId, ...decodeFields(payload.fields) };
}

export async function queryFirebaseDocuments(collection, fieldPath, value, idToken) {
  const response = await fetch(`${firestoreBase}:runQuery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: encodeValue(value),
          },
        },
      },
    }),
  });

  const payload = await parseResponse(response);
  return payload
    .filter((result) => result.document)
    .map((result) => ({
      id: result.document.name.split('/').pop(),
      ...decodeFields(result.document.fields),
    }));
}

export async function deleteFirebaseDocument(collection, documentId, idToken) {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured.');

  const response = await fetch(
    `${firestoreBase}/${encodeURIComponent(collection)}/${encodeURIComponent(documentId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${idToken}` },
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const firebaseMessage = payload?.error?.message?.replaceAll('_', ' ');
    throw new Error(firebaseMessage || 'Could not delete the Firebase document.');
  }

  return true;
}

export async function listFirebaseDocuments(collection, idToken) {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured.');

  const documents = [];
  let pageToken = '';

  do {
    const params = new URLSearchParams({ pageSize: '1000' });
    if (pageToken) params.set('pageToken', pageToken);

    const response = await fetch(
      `${firestoreBase}/${encodeURIComponent(collection)}?${params.toString()}`,
      { headers: { Authorization: `Bearer ${idToken}` } },
    );

    const payload = await parseResponse(response);
    documents.push(
      ...(payload.documents ?? []).map((document) => ({
        id: document.name.split('/').pop(),
        ...decodeFields(document.fields),
      })),
    );
    pageToken = payload.nextPageToken ?? '';
  } while (pageToken);

  return documents;
}
