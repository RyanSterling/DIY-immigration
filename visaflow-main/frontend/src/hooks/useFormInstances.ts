// Form instance management with localStorage persistence

const INSTANCE_PREFIX = "form-instance-";
const INDEX_KEY = "form-instances-index";

export interface FormInstance {
  id: string;
  templateId: string;
  clientId: string;
  status: "draft" | "completed";
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Helper to generate UUID
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to get the index of all instance IDs
function getIndex(): string[] {
  const indexJson = localStorage.getItem(INDEX_KEY);
  if (!indexJson) {
    return [];
  }
  try {
    const parsed = JSON.parse(indexJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Helper to save the index
function saveIndex(ids: string[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

// Helper to get instance key
function getInstanceKey(id: string): string {
  return `${INSTANCE_PREFIX}${id}`;
}

/**
 * Creates a new form instance with the given template and client IDs.
 * Returns the newly created instance.
 */
export function createInstance(
  templateId: string,
  clientId: string
): FormInstance {
  const now = new Date().toISOString();
  const instance: FormInstance = {
    id: generateUUID(),
    templateId,
    clientId,
    status: "draft",
    data: {},
    createdAt: now,
    updatedAt: now,
  };

  // Save the instance
  localStorage.setItem(getInstanceKey(instance.id), JSON.stringify(instance));

  // Update the index
  const index = getIndex();
  index.push(instance.id);
  saveIndex(index);

  return instance;
}

/**
 * Gets an instance by ID.
 * Returns null if not found.
 */
export function getInstance(id: string): FormInstance | null {
  const instanceJson = localStorage.getItem(getInstanceKey(id));
  if (!instanceJson) {
    return null;
  }
  try {
    return JSON.parse(instanceJson) as FormInstance;
  } catch {
    return null;
  }
}

/**
 * Updates an instance with partial data.
 * Returns the updated instance or null if not found.
 */
export function updateInstance(
  id: string,
  data: Partial<FormInstance>
): FormInstance | null {
  const existing = getInstance(id);
  if (!existing) {
    return null;
  }

  const updated: FormInstance = {
    ...existing,
    ...data,
    id: existing.id, // Prevent ID from being changed
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getInstanceKey(id), JSON.stringify(updated));

  return updated;
}

/**
 * Deletes an instance by ID.
 * Returns true if deleted, false if not found.
 */
export function deleteInstance(id: string): boolean {
  const key = getInstanceKey(id);
  const exists = localStorage.getItem(key) !== null;

  if (!exists) {
    return false;
  }

  // Remove the instance
  localStorage.removeItem(key);

  // Update the index
  const index = getIndex();
  const newIndex = index.filter((instanceId) => instanceId !== id);
  saveIndex(newIndex);

  return true;
}

/**
 * Lists all instances for a specific client.
 * Returns instances sorted by updatedAt (most recent first).
 */
export function listInstancesForClient(clientId: string): FormInstance[] {
  const index = getIndex();
  const instances: FormInstance[] = [];

  for (const id of index) {
    const instance = getInstance(id);
    if (instance && instance.clientId === clientId) {
      instances.push(instance);
    }
  }

  // Sort by updatedAt descending (most recent first)
  return instances.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Lists all instances.
 * Returns instances sorted by updatedAt (most recent first).
 */
export function listAllInstances(): FormInstance[] {
  const index = getIndex();
  const instances: FormInstance[] = [];

  for (const id of index) {
    const instance = getInstance(id);
    if (instance) {
      instances.push(instance);
    }
  }

  // Sort by updatedAt descending (most recent first)
  return instances.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
