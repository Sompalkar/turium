export function WakingNotice() {
  return (
    <div className="waking" role="status">
      <span className="waking-dot" aria-hidden="true" />
      <p>
        <strong>Waking the server up.</strong> The API is on a free instance that sleeps when idle,
        so the first request after a quiet spell takes up to a minute while it starts and loads the
        embedding model. Everything is quick after that.
      </p>
    </div>
  );
}
