"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./publication-package-dialog.module.css";

export function OwnerAccessPanel({ busy, error, notice, onUnlock, onCancel }: {
  busy: boolean;
  error?: string;
  notice?: string;
  onUnlock: (key: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [key, setKey] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.scrollIntoView({ block: "nearest" });
    inputRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (error) inputRef.current?.focus({ preventScroll: true });
  }, [error]);

  return <section className={styles.accessNotice} aria-labelledby="owner-access-title">
    <h3 id="owner-access-title">Unlock publishing</h3>
    <p id="owner-access-hint">Use the owner key from the computer hosting Studio. This browser stays unlocked for 7 days. Only unlock on a device you trust.</p>
    {notice ? <p className={styles.accessExplanation} role="status">{notice}</p> : null}
    <form className={styles.accessForm} onSubmit={event => {
        event.preventDefault();
        void onUnlock(key);
      }}>
      <div className={styles.field}>
        <label htmlFor="studio-owner-key">Owner key<span aria-hidden="true"> *</span><span className={styles.srOnly}> (required)</span></label>
        <input ref={inputRef} id="studio-owner-key" autoComplete="current-password" name="studio-owner-key" required maxLength={256}
          aria-invalid={error !== undefined || undefined} aria-describedby={`owner-access-hint${error ? " owner-access-error" : ""}`}
          disabled={busy} onChange={event => setKey(event.target.value)} type="password" value={key} />
      </div>
      <div className={styles.accessActions}>
        <button className={styles.textButton} disabled={busy} onClick={onCancel} type="button">Cancel unlock</button>
        <button className={styles.primaryButton} disabled={busy || !key} type="submit">{busy ? "Unlocking..." : "Unlock publishing"}</button>
      </div>
      {error ? <p className={styles.fieldError} id="owner-access-error" role="alert">{error}</p> : null}
    </form>
  </section>;
}
