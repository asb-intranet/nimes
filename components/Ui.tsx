import React from "react";

export function Card({ children, className = "", style }: any) {
  return <div style={style} className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Button({ children, variant = "primary", className = "", ...props }: any) {
  const styles: any = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    green: "bg-emerald-600 text-white hover:bg-emerald-700",
    amber: "bg-amber-500 text-white hover:bg-amber-600"
  };
  return <button className={`rounded-2xl px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${styles[variant]} ${className}`} {...props}>{children}</button>;
}

export function Field({ label, children }: any) {
  return <label className="block"><span className="text-xs font-bold uppercase text-slate-500">{label}</span>{children}</label>;
}

export function Input({ className = "", ...props }: any) {
  return <input className={`mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-500 ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: any) {
  return <select className={`mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-500 ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: any) {
  return <textarea className={`mt-1 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-500 ${className}`} {...props} />;
}

export function Section({ title, subtitle }: any) {
  return <div className="mb-5"><h2 className="text-2xl font-black">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>;
}

export function Badge({ children, tone = "slate" }: any) {
  const tones: any = {
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700"
  };
  return <span className={`inline-flex w-fit max-w-max items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-black leading-none ${tones[tone]}`}>{children}</span>;
}
