"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
}

export function BlogSection({ posts }: { posts: Post[] }) {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-20">
        <div className="max-w-2xl">
          <span className="text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4 block">
            Operations Mastery
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-[7rem] font-black text-foreground tracking-tighter uppercase italic leading-[0.85] md:leading-[0.8]">
            Retail <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary via-blue-500 to-indigo-500">Insights.</span>
          </h2>
        </div>
        <Link href="/blog" className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-primary hover:gap-4 transition-all pb-2">
          View All Articles <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
        {posts.slice(0, 6).map((post, idx) => (
          <motion.div
            key={post.slug}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.8 }}
            viewport={{ once: true }}
            className="flex h-full"
          >
            <Link 
              href={`https://REMOVED_DOMAIN/blog/${post.slug}`} 
              className="group w-full flex flex-col"
            >
              <div className="flex-1 bg-card/40 backdrop-blur-2xl border border-border/50 rounded-4xl md:rounded-[3rem] p-8 md:p-12 hover:border-primary/50 transition-all duration-500 shadow-2xl group-hover:-translate-y-2">
                <div className="flex justify-between items-start mb-8 md:mb-12">
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                    Guide
                  </span>
                  <span 
                    className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
                    suppressHydrationWarning
                  >
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-black uppercase tracking-tight mb-4 md:mb-6 group-hover:text-primary transition-colors leading-tight">
                  {post.title}
                </h3>
                <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest leading-relaxed mb-10 line-clamp-3 opacity-60">
                  {post.excerpt}
                </p>
                <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-0 group-hover:opacity-100 transition-all">
                  Deep Dive <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
