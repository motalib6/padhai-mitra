import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db, ensureAnonymousAuth } from "../firebase";

/** Save a note-set to Firestore under the anonymous user's library. */
export async function saveNoteSet(
  title: string,
  content: string,
): Promise<string> {
  if (!db) throw new Error("Firebase is not configured yet.");
  const uid = await ensureAnonymousAuth();
  const ref = await addDoc(collection(db, "users", uid, "noteSets"), {
    title,
    content,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
