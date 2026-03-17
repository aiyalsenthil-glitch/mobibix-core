"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getMyFollowUps,
  updateFollowUpStatus,
  type FollowUp,
  type FollowUpStatus,
} from "@/services/crm.api";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Phone, 
  Search, 
  MessageSquare, 
  MoreVertical,
  ChevronRight,
  AlertCircle
} from "lucide-react";

import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 50;

export function MyFollowUpsWidget() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalFollowUps, setTotalFollowUps] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [activeBucket, setActiveBucket] = useState<"ALL" | "OVERDUE" | "TODAY" | "UPCOMING">("ALL");

  const loadFollowUps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMyFollowUps({
        skip: currentPage * PAGE_SIZE,
        take: PAGE_SIZE,
      });

      if (Array.isArray(result)) {
        setFollowUps(result);
        setTotalFollowUps(result.length);
      } else {
        setFollowUps(result.data);
        setTotalFollowUps(result.total);
      }
    } catch (err: unknown) {
      setError((err as any)?.message || "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  async function updateStatus(followUpId: string, status: FollowUpStatus) {
    try {
      await updateFollowUpStatus(followUpId, status);
      setFollowUps((prev) =>
        prev.map((item) =>
          item.id === followUpId ? { ...item, status: status } : item,
        ),
      );
      // Notify sidebar and tabs to refresh counts
      window.dispatchEvent(new CustomEvent("refresh-followup-counts"));
    } catch (err: unknown) {
      alert((err as any)?.message || `Failed to update follow-up to ${status}`);
    }
  }


  // Stats logic
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pending = followUps.filter(f => f.status === "PENDING");
    
    return {
      overdue: pending.filter(f => new Date(f.followUpAt) < now).length,
      today: pending.filter(f => {
        const d = new Date(f.followUpAt);
        return d >= today && d < tomorrow;
      }).length,
      upcoming: pending.filter(f => new Date(f.followUpAt) >= tomorrow).length,
      completed: followUps.filter(f => f.status === "DONE").length
    };
  }, [followUps]);

  // Filter logic
  const filteredFollowUps = useMemo(() => {
    return followUps.filter(f => {
      const matchesSearch = 
        f.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === "ALL" || f.type === typeFilter;
      
      const now = new Date();
      const today = new Date();
      today.setHours(0,0,0,0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let matchesBucket = true;
      if (activeBucket === "OVERDUE") matchesBucket = f.status === "PENDING" && new Date(f.followUpAt) < now;
      if (activeBucket === "TODAY") matchesBucket = f.status === "PENDING" && new Date(f.followUpAt) >= today && new Date(f.followUpAt) < tomorrow;
      if (activeBucket === "UPCOMING") matchesBucket = f.status === "PENDING" && new Date(f.followUpAt) >= tomorrow;

      return matchesSearch && matchesType && matchesBucket;
    });
  }, [followUps, searchTerm, typeFilter, activeBucket]);

  if (loading && followUps.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Quick View */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Overdue" 
          value={stats.overdue} 
          icon={<AlertCircle className="w-5 h-5" />} 
          color="text-red-500" 
          bgColor="bg-red-500/10"
          active={activeBucket === "OVERDUE"}
          onClick={() => setActiveBucket(activeBucket === "OVERDUE" ? "ALL" : "OVERDUE")}
        />
        <StatCard 
          label="Due Today" 
          value={stats.today} 
          icon={<Clock className="w-5 h-5" />} 
          color="text-amber-500" 
          bgColor="bg-amber-500/10"
          active={activeBucket === "TODAY"}
          onClick={() => setActiveBucket(activeBucket === "TODAY" ? "ALL" : "TODAY")}
        />
        <StatCard 
          label="Upcoming" 
          value={stats.upcoming} 
          icon={<Calendar className="w-5 h-5" />} 
          color="text-blue-500" 
          bgColor="bg-blue-500/10"
          active={activeBucket === "UPCOMING"}
          onClick={() => setActiveBucket(activeBucket === "UPCOMING" ? "ALL" : "UPCOMING")}
        />
        <StatCard 
          label="Completed" 
          value={stats.completed} 
          icon={<CheckCircle2 className="w-5 h-5" />} 
          color="text-emerald-500" 
          bgColor="bg-emerald-500/10"
          active={false}
          onClick={() => {}}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-stone-900 border border-gray-100 dark:border-white/5 p-4 rounded-2xl shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search customer or purpose..." 
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border-transparent focus:border-teal-500 focus:ring-0 rounded-xl text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
            <Filter className="w-4 h-4" />
            <span>Type:</span>
          </div>
          <select 
            className="bg-gray-50 dark:bg-white/5 border-transparent focus:border-teal-500 focus:ring-0 rounded-xl text-sm py-2 px-3 transition-all"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Types</option>
            <option value="PHONE_CALL">Calls</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="VISIT">In-Person</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
          <button 
            onClick={loadFollowUps}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
            title="Refresh"
          >
            <Clock className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* List / Results */}
      <div className="bg-white dark:bg-stone-900 border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
        {filteredFollowUps.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No follow-ups found</h3>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            {filteredFollowUps.map((item) => (
              <FollowUpRow 
                key={item.id} 
                item={item} 
                onStatusChange={updateStatus} 
              />
            ))}
          </div>
        )}
      </div>


      {/* Pagination */}
      {totalFollowUps > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-500">
            Showing {currentPage * PAGE_SIZE + 1} to {Math.min((currentPage + 1) * PAGE_SIZE, totalFollowUps)} of {totalFollowUps}
          </p>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-stone-900 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-all"
            >
              Previous
            </button>
            <button 
              disabled={(currentPage + 1) * PAGE_SIZE >= totalFollowUps}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-4 py-2 text-sm font-medium bg-white dark:bg-stone-900 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, bgColor, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all text-left flex items-start justify-between group ${
        active 
          ? "border-teal-500 bg-teal-500/5 shadow-md scale-[1.02]" 
          : "border-gray-100 dark:border-white/5 bg-white dark:bg-stone-900 hover:border-teal-500/50 hover:shadow-sm"
      }`}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors uppercase tracking-wider text-[10px]">
          {label}
        </p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
      </div>
      <div className={`p-2 rounded-xl ${bgColor}`}>
        {icon}
      </div>
    </button>
  );
}

function FollowUpRow({ item, onStatusChange }: { item: FollowUp; onStatusChange: (id: string, status: FollowUpStatus) => void }) {
  const isPending = item.status === "PENDING";
  const isOverdue = isPending && new Date(item.followUpAt) < new Date();
  
  return (
    <div className={`group flex items-center gap-4 p-4 hover:bg-gray-50/80 dark:hover:bg-white/5 transition-all ${!isPending ? 'opacity-60' : ''}`}>
      {/* Icon based on type */}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110 ${getTypeStyles(item.type)}`}>
        {getTypeIcon(item.type)}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {item.customerName || "No Customer Name"}
          </h4>
          {isOverdue && (
            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded">OVERDUE</span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
          {item.purpose}
        </p>
        <div className="flex items-center gap-3 mt-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 whitespace-nowrap">
            <Clock className="w-3 h-3" />
            <span>{formatFullDate(item.followUpAt)}</span>
          </div>
          {item.assignedToUserName && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 whitespace-nowrap">
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span>Assigned to: <span className="text-gray-500 dark:text-stone-300 font-medium">{item.assignedToUserName}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isPending ? (
          <>
            <div className="hidden md:flex items-center gap-1">
              {item.customerPhone && (
                <>
                  <a 
                    href={`tel:${item.customerPhone}`}
                    className="p-2 hover:bg-teal-50 dark:hover:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl transition-colors"
                    title={`Call ${item.customerPhone}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a 
                    href={`https://wa.me/${item.customerPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-teal-50 dark:hover:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
            <button 
              onClick={() => onStatusChange(item.id, "DONE")}
              className="ml-2 bg-teal-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-600 shadow-sm shadow-teal-500/20 transition-all active:scale-95"
            >
              Done
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-bold">{item.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}</span>
          </div>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {isPending && (
              <>
                <DropdownMenuItem onClick={() => onStatusChange(item.id, "DONE")}>
                  Mark as Done
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange(item.id, "CANCELLED")} className="text-red-600 dark:text-red-400">
                  Cancel Task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem disabled>
              Edit Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}


function getTypeIcon(type: string) {
  switch (type) {
    case "PHONE_CALL": return <Phone className="w-5 h-5" />;
    case "WHATSAPP": return <MessageSquare className="w-5 h-5" />;
    case "VISIT": return <ChevronRight className="w-5 h-5 rotate-90" />;
    case "EMAIL": return <MoreVertical className="w-5 h-5 rotate-90" />;
    default: return <Clock className="w-5 h-5" />;
  }
}

function getTypeStyles(type: string) {
  switch (type) {
    case "PHONE_CALL": return "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400";
    case "WHATSAPP": return "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
    case "VISIT": return "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400";
    case "EMAIL": return "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400";
    default: return "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400";
  }
}

function formatFullDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-2xl" />
        ))}
      </div>
      <div className="h-16 bg-gray-100 dark:bg-white/5 rounded-2xl" />
      <div className="bg-gray-100 dark:bg-white/5 rounded-2xl h-96" />
    </div>
  );
}

