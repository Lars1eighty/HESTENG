import Link from "next/link";

type DashboardCardProps = {
  label: string;
  title: string;
  description: string;
  icon: string;
  buttonText: string;
  href: string;
};

export default function DashboardCard({
  label,
  title,
  description,
  icon,
  buttonText,
  href,
}: DashboardCardProps) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-orange-500 hover:shadow-orange-500/10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-orange-500">
            {label}
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            {title}
          </h2>

          <p className="mt-3 text-gray-400">
            {description}
          </p>
        </div>

        <div className="text-6xl">
          {icon}
        </div>
      </div>

      <Link
        href={href}
        className="mt-8 block w-full rounded-xl bg-orange-500 py-3 text-center text-lg font-semibold text-white transition hover:bg-orange-600"
      >
        {buttonText}
      </Link>
    </div>
  );
}