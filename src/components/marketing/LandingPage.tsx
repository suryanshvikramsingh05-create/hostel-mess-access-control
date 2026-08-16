import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Button from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import {
  BarChartIcon,
  BuildingIcon,
  CheckCircleIcon,
  ClipboardListIcon,
  IdCardIcon,
  KeyRoundIcon,
  QrCodeIcon,
  ScanLineIcon,
  UsersIcon,
} from "@/components/ui/icons";

const ROLE_CARDS = [
  {
    icon: <BuildingIcon className="h-5 w-5" />,
    title: "Admin",
    description:
      "Manage hostels and messes, onboard residents and wardens, review reports and the full audit trail.",
  },
  {
    icon: <ScanLineIcon className="h-5 w-5" />,
    title: "Warden",
    description:
      "Scan resident QR codes, verify their PIN, and record mess entries for their assigned hostel in seconds.",
  },
  {
    icon: <IdCardIcon className="h-5 w-5" />,
    title: "Resident",
    description:
      "Carry a personal mess pass — QR code plus PIN — and track today's entries and full history at a glance.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: <QrCodeIcon className="h-5 w-5" />,
    title: "Scan the pass",
    description: "The resident presents their QR mess pass at the counter.",
  },
  {
    icon: <KeyRoundIcon className="h-5 w-5" />,
    title: "Enter the PIN",
    description: "A short PIN confirms it's really them, not just the code.",
  },
  {
    icon: <CheckCircleIcon className="h-5 w-5" />,
    title: "Instant decision",
    description: "Approved or rejected immediately, with the reason recorded.",
  },
];

const FEATURES = [
  {
    icon: <QrCodeIcon className="h-5 w-5" />,
    title: "QR + PIN entry",
    description: "Two-factor mess entry that's fast at the counter and hard to spoof.",
  },
  {
    icon: <ClipboardListIcon className="h-5 w-5" />,
    title: "4-entries-per-day cap",
    description: "Enforced atomically at the database level — no race conditions, no double counting.",
  },
  {
    icon: <BarChartIcon className="h-5 w-5" />,
    title: "Reports & analytics",
    description: "Approved vs. rejected trends, by meal and by mess, over any date range.",
  },
  {
    icon: <UsersIcon className="h-5 w-5" />,
    title: "Full audit trail",
    description: "Every login, entry, and administrative change is logged for accountability.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Link href="/login">
            <Button size="sm">Sign in</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,#eef2ff,transparent_60%)]"
          />
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Hostel mess access control
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              One pass. Every meal, verified.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
              MessPass gives every resident a QR + PIN mess pass, gives wardens a
              fast counter-side scan flow, and gives admins full visibility —
              hostels, messes, reports and an audit log in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/login">
                <Button size="md">Sign in to your dashboard</Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="md">
                  See how it works
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Role cards */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {ROLE_CARDS.map((role) => (
              <Card key={role.title} className="animate-fade-in">
                <CardBody>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    {role.icon}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">{role.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500">{role.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">How it works</h2>
              <p className="mt-2 text-sm text-slate-500">
                Three steps at the mess counter, backed by a database-enforced daily limit.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.title} className="relative text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
                    {step.icon}
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature grid */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Built for the whole team</h2>
            <p className="mt-2 text-sm text-slate-500">
              From the front counter to the admin dashboard.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardBody>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    {f.icon}
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-500">{f.description}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <Card className="mx-auto max-w-3xl">
            <CardBody className="flex flex-col items-center gap-4 py-10 text-center">
              <Logo size="lg" withText={false} />
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">Ready to sign in?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Admins, wardens and residents all sign in from the same place.
                </p>
              </div>
              <Link href="/login">
                <Button size="md">Sign in</Button>
              </Link>
            </CardBody>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-400 sm:px-6">
        MessPass — a demo/portfolio build of a hostel mess access control system.
      </footer>
    </div>
  );
}
