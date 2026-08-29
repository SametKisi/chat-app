export const SidebarSkeleton = () => {
    return (
        <div className="flex flex-col gap-2 animate-pulse w-full">
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#111b21]/40 border border-transparent">
                    {/* Yuvarlak Avatar Skeleton */}
                    <div className="w-10 h-10 rounded-full bg-slate-700/60 shrink-0" />
                    
                    {/* İsim ve Kullanıcı Adı Çizgileri */}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <div className="h-3.5 bg-slate-700/70 rounded-md w-3/4" />
                        <div className="h-2.5 bg-slate-700/40 rounded-md w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
};