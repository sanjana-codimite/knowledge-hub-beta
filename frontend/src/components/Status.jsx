// Status is a small badge used by DocumentCard, ThreadCard, and Panel.
// It is a shared component because those three all need it.
export function Status({ label }) {
  return (
    <span className={`status ${label.toLowerCase().replace(" ", "-")}`}>
      {label}
    </span>
  );
}
