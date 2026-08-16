import { DoorOpenIcon } from "./icons";

const sizeClasses = {
  sm: { mark: "h-7 w-7", icon: "h-3.5 w-3.5", text: "text-sm" },
  md: { mark: "h-8 w-8", icon: "h-4 w-4", text: "text-sm" },
  lg: { mark: "h-11 w-11", icon: "h-5 w-5", text: "text-xl" },
} as const;

export default function Logo({
  size = "md",
  withText = true,
  className = "",
}: {
  size?: keyof typeof sizeClasses;
  withText?: boolean;
  className?: string;
}) {
  const s = sizeClasses[size];
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 ${s.mark}`}
      >
        <DoorOpenIcon className={s.icon} />
      </div>
      {withText && (
        <span className={`font-semibold tracking-tight text-slate-900 ${s.text}`}>MessPass</span>
      )}
    </div>
  );
}
