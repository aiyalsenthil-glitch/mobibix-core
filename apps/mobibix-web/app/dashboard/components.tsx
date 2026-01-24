"use client";

export function ComingSoonPage({
  title,
  emoji,
  description,
}: {
  title: string;
  emoji: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6">{emoji}</div>
        <h1 className="text-4xl font-bold text-white mb-4">{title}</h1>
        <p className="text-stone-400 mb-8">{description}</p>
        <div className="inline-block px-8 py-3 bg-teal-500/20 border border-teal-500/50 rounded-lg">
          <p className="text-teal-300 font-semibold">Coming Soon</p>
        </div>
      </div>
    </div>
  );
}
