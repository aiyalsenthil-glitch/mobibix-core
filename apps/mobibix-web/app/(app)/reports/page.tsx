"use client";

import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { FileText, ShoppingBag, Box, TrendingUp } from "lucide-react";

export default function ReportsPage() {
  const { theme } = useTheme();
  const router = useRouter();

  const REPORT_CARDS = [
    {
      title: "Sales Report",
      description: "View daily sales, invoices, and profit analysis.",
      icon: <FileText className="w-6 h-6" />,
      href: "/reports/sales",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Purchase Report",
      description: "Track supplier purchases and stock entries.",
      icon: <ShoppingBag className="w-6 h-6" />,
      href: "/reports/purchases",
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "Inventory Report",
      description: "Monitor stock levels, values, and low stock alerts.",
      icon: <Box className="w-6 h-6" />,
      href: "/reports/inventory",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-900/20",
    },
    {
      title: "Profit Summary",
      description: "Analyze revenue, costs, and profit margins.",
      icon: <TrendingUp className="w-6 h-6" />,
      href: "/reports/profit",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
  ];

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-950" : "bg-gray-50"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Reports
          </h1>
          <p
            className={`mt-1 ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Access detailed financial and inventory reports
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {REPORT_CARDS.map((card) => (
            <div
              key={card.href}
              onClick={() => router.push(card.href)}
              className={`p-6 rounded-xl border cursor-pointer transition-all hover:shadow-lg ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-800 hover:border-gray-700"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-lg ${card.bg} ${card.color}`}
                >
                  {card.icon}
                </div>
                <div>
                  <h3
                    className={`text-lg font-semibold mb-1 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
