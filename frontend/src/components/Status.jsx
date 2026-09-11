// Status is a small badge used by DocumentCard, ThreadCard, and Panel.
// It is a shared component because those three all need it.
//
// Rebuilt fully in Tailwind: the old version added a `status <slugified-label>`
// class and relied on CSS (.current/.answered/.outdated/.open/.in-review) that
// only matched a handful of exact labels. Callers like MyDocsView pass raw
// values such as "draft", "in_review", "approved", "rejected" straight through,
// so most badges were silently rendering with no color at all. This maps every
// known status to the app's real palette and falls back gracefully for
// anything unrecognized, instead of failing silently.
const STATUS_STYLES = {
  current:   "text-[#8ff0c0] border-[rgba(95,227,161,0.4)] bg-[rgba(95,227,161,0.12)]",
  answered:  "text-[#8ff0c0] border-[rgba(95,227,161,0.4)] bg-[rgba(95,227,161,0.12)]",
  approved:  "text-[#8ff0c0] border-[rgba(95,227,161,0.4)] bg-[rgba(95,227,161,0.12)]",
  outdated:  "text-[#ffcf94] border-[rgba(255,176,88,0.4)] bg-[rgba(255,176,88,0.12)]",
  open:      "text-[#ffcf94] border-[rgba(255,176,88,0.4)] bg-[rgba(255,176,88,0.12)]",
  "in-review": "text-[#c3caff] border-[rgba(169,180,255,0.4)] bg-[rgba(169,180,255,0.12)]",
  draft:     "text-[rgba(238,240,255,0.65)] border-white/20 bg-white/[0.06]",
  rejected:  "text-[#ffb3b3] border-[rgba(255,106,106,0.4)] bg-[rgba(255,106,106,0.12)]",
};

const DEFAULT_STYLE = "text-[rgba(238,240,255,0.65)] border-white/20 bg-white/[0.06]";

export function Status({ label }) {
  const slug = label.toLowerCase().trim().replace(/[\s_]+/g, "-");
  const styles = STATUS_STYLES[slug] || DEFAULT_STYLE;

  return (
    <span
      className={`inline-flex items-center w-fit h-[22px] px-[9px] rounded-lg border text-[11px] font-semibold whitespace-nowrap ${styles}`}
    >
      {label}
    </span>
  );
}