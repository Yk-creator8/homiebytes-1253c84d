import markAsset from "@/assets/homiebytes-mark.png.asset.json";

export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img
        src={markAsset.url}
        alt="HomieBytes"
        className="h-full w-full object-contain drop-shadow-[0_2px_8px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
      />
    </div>
  );
}

export function LogoWordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <Logo className="h-11 w-11" />
      <div className="leading-none">
        <div className="font-display text-[22px] font-extrabold tracking-tight">
          <span className="text-primary">homie</span>
          <span className="text-foreground">bytes</span>
        </div>
        <div className="text-[9px] font-semibold text-muted-foreground tracking-[0.14em] mt-1 uppercase">
          Homemade · Delivered
        </div>
      </div>
    </div>
  );
}
