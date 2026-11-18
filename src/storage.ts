import { openDB } from "idb";
import { fresh, validate, type Save } from "./model";
const db = openDB("frontier-progress", 1, {
  upgrade(db) {
    db.createObjectStore("saves");
  },
});
export async function load(): Promise<Save> {
  const d = await db;
  for (const key of ["current", "backup"]) {
    try {
      const s = await d.get("saves", key);
      if (s) return validate(s);
    } catch {
      /* Try backup. */
    }
  }
  return fresh();
}
let queue = Promise.resolve();
export function store(s: Save) {
  const snapshot = validate(s);
  const operation = queue.then(async () => {
    const d = await db;
    const tx = d.transaction("saves", "readwrite");
    const old = await tx.store.get("current");
    if (old) {
      try {
        validate(old);
        await tx.store.put(old, "backup");
      } catch {}
    }
    await tx.store.put(snapshot, "current");
    await tx.done;
  });
  queue = operation.catch(() => {});
  return operation;
}
