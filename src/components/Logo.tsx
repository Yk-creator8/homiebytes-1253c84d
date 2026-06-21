import markAsset from "@/assets/homiebytes-mark.png.asset.json";

export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <img src={markAsset.url} alt="HomieBytes" className="h-full w-full object-contain" />
    </div>
  );
}

export function LogoWordmark() {
  return (
    <div className="flex items-center gap-2">
      <Logo />
      <div className="leading-none">
        <div className="font-display text-xl font-extrabold tracking-tight">
          <span className="text-primary">homie</span>
          <span className="text-foreground">bytes</span>
        </div>
        <div className="text-[10px] font-semibold text-muted-foreground tracking-[0.08em] mt-0.5">
          HOMEMADE WITH LOVE · DELIVERED TO YOU
        </div>
      </div>
    </div>
  );
}
