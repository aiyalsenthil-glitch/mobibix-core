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
    <section className="py-32 px-6 bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-300">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter uppercase leading-none italic">
                Latest <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Retail</span> Insights.
            </h2>
            <p className="text-lg text-muted-foreground font-bold leading-relaxed">
                Expert tips and industry guides to help you transform your mobile shop into a high-growth tech retail business.
            </p>
          </div>
          <Link href="/blog" className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary hover:gap-4 transition-all pb-2">
            View All Articles <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.slice(0, 3).map((post, idx) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
            >
              <Link href={`/blog/${post.slug}`} className="group h-full flex flex-col">
                <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2.5rem] p-8 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-500 shadow-sm hover:shadow-xl group-hover:-translate-y-2">
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-full">
                      Guide
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-4 group-hover:text-primary transition-colors leading-tight">
                    {post.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed mb-8 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Deep Dive <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
