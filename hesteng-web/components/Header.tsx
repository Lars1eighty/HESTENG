import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-gray-800 px-8 py-6">
      <Link href="/">
        <h1 className="text-3xl font-bold text-orange-500">
          HESTENG
        </h1>
        <p className="text-sm text-gray-400">
          Measure. Improve. Compete.
        </p>
      </Link>

      <div className="text-gray-300">
        👤 Lars
      </div>
    </header>
  );
}
