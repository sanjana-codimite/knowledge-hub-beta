export function PageTitle({ title, subtitle, action, onAction }) {
  return (
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