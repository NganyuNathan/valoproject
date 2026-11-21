import { supabase, uploadPrivateFile, BUCKETS } from './supabase';
import { updateApplicationDetails } from './applicationService';
import { syncPayments } from './paymentService';

/**
 * Documents are NEVER sent to Supabase before the payment is confirmed. While the student is
 * paying, the chosen files wait in this browser's own storage (IndexedDB) — not on any server.
 * As soon as the payment is confirmed (in this session, or later when the student comes back
 * to the site in the same browser), they are uploaded and attached to the application, and the
 * local copy is deleted. This is what keeps the documents from being lost if the student
 * closes the tab or is sent away to Fapshi's page and back.
 */

const DB_NAME = 'valointern-pending-uploads';
const STORE = 'uploads';
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // forget files for payments never completed after 14 days

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'applicationId' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** entry: { applicationId, userId, resumeFile, coverLetterFile, documents, profileResumePath, profileCoverLetterPath } */
export async function savePendingUpload(entry) {
  try { await withStore('readwrite', (s) => s.put({ ...entry, savedAt: Date.now() })); return true; }
  catch { return false; } // private browsing etc.: the in-page flow still works, it just can't survive a reload
}

export async function deletePendingUpload(applicationId) {
  try { await withStore('readwrite', (s) => s.delete(applicationId)); } catch { /* nothing to clean */ }
}

async function listPendingUploads(userId) {
  try {
    const all = (await withStore('readonly', (s) => s.getAll())) || [];
    return all.filter((e) => e.userId === userId);
  } catch { return []; }
}

const safe = (name) => name.replace(/[^\w.-]+/g, '_');
const inFlight = new Set(); // stops two code paths uploading the same application at once

/**
 * Uploads the files and saves them on the application row. Only call once the payment is
 * confirmed (the database refuses it otherwise). Returns false if another upload of the same
 * application is already running.
 */
export async function uploadAndAttach(entry) {
  const { applicationId, userId } = entry;
  if (inFlight.has(applicationId)) return false;
  inFlight.add(applicationId);
  const uploaded = []; // so a half-finished attempt doesn't leave orphan files behind
  try {
    const stamp = Date.now();
    let resumeUrl = entry.profileResumePath || null;
    let coverLetterUrl = entry.profileCoverLetterPath || null;

    if (entry.resumeFile) {
      resumeUrl = await uploadPrivateFile(BUCKETS.RESUMES, `${userId}/${applicationId}/${stamp}-resume-${safe(entry.resumeFile.name)}`, entry.resumeFile);
      uploaded.push([BUCKETS.RESUMES, resumeUrl]);
    }
    if (entry.coverLetterFile) {
      coverLetterUrl = await uploadPrivateFile(BUCKETS.COVER_LETTERS, `${userId}/${applicationId}/${stamp}-cover-${safe(entry.coverLetterFile.name)}`, entry.coverLetterFile);
      uploaded.push([BUCKETS.COVER_LETTERS, coverLetterUrl]);
    }

    let documents;
    if (entry.documents?.length) {
      documents = [];
      for (let i = 0; i < entry.documents.length; i++) {
        const file = entry.documents[i];
        const path = await uploadPrivateFile(BUCKETS.RESUMES, `${userId}/${applicationId}/documents/${stamp}-${i}-${safe(file.name)}`, file);
        uploaded.push([BUCKETS.RESUMES, path]);
        documents.push({ name: file.name, path });
      }
    }

    await updateApplicationDetails(applicationId, { resumeUrl, coverLetterUrl, documents });
    await deletePendingUpload(applicationId);
    return true;
  } catch (err) {
    await Promise.all(uploaded.map(([bucket, path]) => supabase.storage.from(bucket).remove([path]).catch(() => null)));
    throw err;
  } finally {
    inFlight.delete(applicationId);
  }
}

/**
 * Looks for documents this browser is still holding for the signed-in student. For each one whose
 * payment has now been confirmed, uploads it. Returns how many applications were completed.
 */
export async function finishPendingUploads(userId) {
  const entries = await listPendingUploads(userId);
  if (entries.length === 0) return 0;

  await syncPayments(); // make sure a payment finished on Fapshi is recorded before we look
  let completed = 0;
  for (const entry of entries) {
    if (Date.now() - entry.savedAt > MAX_AGE_MS) { await deletePendingUpload(entry.applicationId); continue; }
    const { data: app } = await supabase
      .from('applications').select('payment_status, status, resume_url').eq('id', entry.applicationId).maybeSingle();
    if (!app) { await deletePendingUpload(entry.applicationId); continue; } // application was deleted
    if (app.resume_url) { await deletePendingUpload(entry.applicationId); continue; } // already complete
    if (app.payment_status !== 'verified' || app.status === 'unpaid') continue; // still waiting for payment
    try { if (await uploadAndAttach(entry)) completed++; } catch { /* retried on the next check */ }
  }
  return completed;
}
