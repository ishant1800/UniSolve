import React from 'react';

const PageSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden="true">
      {/* Title Section Shimmer */}
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="h-8 w-1/3 rounded-lg bg-slate-200"></div>
        <div className="mt-3 h-4 w-1/2 rounded-lg bg-slate-200"></div>
      </div>

      {/* Stats Cards Shimmer */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-3xl bg-white p-5 shadow-sm space-y-3">
            <div className="h-5 w-20 rounded-full bg-slate-200"></div>
            <div className="h-10 w-16 rounded-lg bg-slate-200"></div>
          </div>
        ))}
      </div>

      {/* Main Container Shimmer */}
      <div className="rounded-3xl bg-white p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="h-6 w-1/4 rounded-lg bg-slate-200"></div>
          <div className="h-8 w-24 rounded-full bg-slate-200"></div>
        </div>
        
        {/* Table/List Rows Shimmer */}
        <div className="space-y-3">
          {[1, 2, 3].map((row) => (
            <div key={row} className="flex items-center justify-between py-4 border-b border-slate-100">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/3 rounded bg-slate-200"></div>
                <div className="h-3 w-1/4 rounded bg-slate-200"></div>
              </div>
              <div className="h-6 w-16 rounded-full bg-slate-200"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
