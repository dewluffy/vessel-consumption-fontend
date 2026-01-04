export default function Select({ className = "", children, ...props }) {
  return (
    <select
      className={[
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
        "focus:ring-4 focus:ring-slate-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </select>
  );
}
