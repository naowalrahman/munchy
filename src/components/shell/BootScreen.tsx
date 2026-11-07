export function BootScreen({ message }: { message: string }) {
  return (
    <main className="boot">
      <span className="brand">
        munchy<span className="brand-mark">✳</span>
      </span>
      <p className="muted">{message}</p>
    </main>
  );
}
