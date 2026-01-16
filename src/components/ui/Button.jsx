export default function Button({ className = "", variant = "primary", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-900",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    report:
  "bg-sky-50 text-sky-700 border border-sky-200 shadow-sm hover:bg-sky-100 hover:border-sky-300 hover:shadow",

  };
  return <button className={`${base} ${styles[variant]} ${className}`} {...props} />;
}
