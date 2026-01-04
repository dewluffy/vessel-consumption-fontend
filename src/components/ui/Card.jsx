export function Card({ className = "", ...props }) {
  return <div className={`rounded-2xl bg-white shadow-sm border border-slate-100 ${className}`} {...props} />;
}
export function CardHeader({ className = "", ...props }) {
  return <div className={`p-5 border-b border-slate-100 ${className}`} {...props} />;
}
export function CardBody({ className = "", ...props }) {
  return <div className={`p-5 ${className}`} {...props} />;
}
