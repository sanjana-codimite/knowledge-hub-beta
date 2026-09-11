// PageTitle renders a section header with an optional action button.
// Used by the Threads and Sources views.
export function PageTitle({ title, subtitle, action, onAction }) {
  return (
    // Previously relied on a `.page-title` flex rule that didn't exist in App.css,
    // so title/button weren't actually being spaced apart — now laid out with Tailwind.
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-[#eef0ff]">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm text-[rgba(238,240,255,0.6)]">{subtitle}</p>}
      </div>
      {action && (
        // upload-button kept in CSS — gradient glass button, shared with the topbar upload button
        <button className="upload-button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}