import Link from "next/link";
import { Coffee, Smartphone, Scale } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-orange-50 flex justify-center">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Elevate Your Morning Routine
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                The ultimate companion for your pourover coffee station. Sync recipes to your ESP32-powered scale controller.
              </p>
            </div>
            <div className="space-x-4">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-md bg-orange-700 px-8 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-orange-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 flex justify-center">
        <div className="container px-4 md:px-6">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="p-4 bg-orange-100 rounded-full">
                <Coffee className="h-10 w-10 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold">Recipe Management</h3>
              <p className="text-gray-500">
                Create and manage your favorite coffee recipes with precise steps and flow rates.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="p-4 bg-orange-100 rounded-full">
                <Smartphone className="h-10 w-10 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold">ESP32 Sync</h3>
              <p className="text-gray-500">
                Instantly fetch your recipes on your brewing station via our REST API.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="p-4 bg-orange-100 rounded-full">
                <Scale className="h-10 w-10 text-orange-700" />
              </div>
              <h3 className="text-xl font-bold">Live Brewing</h3>
              <p className="text-gray-500">
                Real-time weight and timer tracking synchronized with your BLE-enabled coffee scale.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
