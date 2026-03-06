import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { getAllPosts } from "../../lib/blog";
import Link from "next/link";
import { Metadata } from "next";
import { motion } from "framer-motion";

export const metadata: Metadata = {
  title: "MobiBix Blog — Mobile Retail Growth Tips & Guides",
  description: "Read the latest tips, guides, and comparison articles on running a profitable mobile electronics store in India.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/blog"
  }
};

export default async function BlogIndex({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const currentPage = parseInt(page || '1');
  const postsPerPage = 6;
  
  const allPosts = getAllPosts();
  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  
  const posts = allPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Header />
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none text-center text-center">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto max-w-5xl pt-44 pb-32 px-6 relative z-10">
        <div className="text-center mb-20">
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter uppercase leading-none italic">
                Retail <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Growth</span> Hub.
            </h1>
            <p className="text-xl text-muted-foreground font-bold max-w-2xl mx-auto leading-relaxed">
                Strategies, comparisons, and guides to help Indian mobile shop owners scale without the chaos.
            </p>
        </div>

        <div className="grid gap-10">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
                <div className="group border border-border bg-card/40 backdrop-blur-xl rounded-[2.5rem] p-10 hover:border-primary/50 transition-all duration-500">
                  <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between mb-4">
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">{post.title}</h2>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full whitespace-nowrap">
                        {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-muted-foreground font-bold leading-relaxed max-w-3xl">
                    {post.excerpt}
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary group-hover:gap-4 transition-all">
                      Read Article 
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </div>
                </div>
            </Link>
          ))}
          {posts.length === 0 && (
              <div className="text-center py-20 bg-muted/20 border border-border rounded-[2.5rem]">
                  <p className="text-muted-foreground font-bold">New articles are being published soon.</p>
              </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-20 flex items-center justify-center gap-4">
            {currentPage > 1 ? (
              <Link 
                href={`/blog?page=${currentPage - 1}`}
                className="px-8 py-4 rounded-2xl border border-border bg-card/50 backdrop-blur-md text-[10px] font-black uppercase tracking-widest hover:border-primary/50 transition-all"
              >
                Previous
              </Link>
            ) : (
              <div className="px-8 py-4 rounded-2xl border border-border opacity-30 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                Previous
              </div>
            )}

            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Page {currentPage} of {totalPages}
            </div>

            {currentPage < totalPages ? (
              <Link 
                href={`/blog?page=${currentPage + 1}`}
                className="px-8 py-4 rounded-2xl border border-border bg-card/50 backdrop-blur-md text-[10px] font-black uppercase tracking-widest hover:border-primary/50 transition-all"
              >
                Next
              </Link>
            ) : (
              <div className="px-8 py-4 rounded-2xl border border-border opacity-30 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                Next
              </div>
            )}
          </div>
        )}
      </div>
      <Footer compact={false} />
    </div>
  );
}
