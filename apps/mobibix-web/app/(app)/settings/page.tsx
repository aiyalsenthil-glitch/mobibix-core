export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-4xl shadow-sm">
        ⚙️
      </div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        Settings
      </h1>
      <p className="text-gray-500 max-w-sm text-center">
        We are building a powerful settings panel for you. Stay tuned!
      </p>
      <span className="px-4 py-2 bg-teal-50 text-teal-700 text-xs font-bold rounded-full uppercase tracking-widest border border-teal-100">
        Coming Soon
      </span>
    </div>
  );
}
