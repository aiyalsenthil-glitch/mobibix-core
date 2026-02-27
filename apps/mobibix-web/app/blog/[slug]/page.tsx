import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { getAllPosts, getPostBySlug } from "../../../lib/blog";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const post = getPostBySlug(resolvedParams.slug);

  if (!post) {
      return { title: 'Post Not Found | MobiBix' }
  }

  return {
    title: `${post.title} | MobiBix Blog`,
    description: post.excerpt,
    alternates: {
      canonical: `https://REMOVED_DOMAIN/blog/${post.slug}`
    }
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const post = getPostBySlug(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-hidden">
      <Header />
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none text-center">
        <div className="absolute top-[10%] right-[-20%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[40%] left-[-20%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto max-w-4xl pt-44 pb-32 px-6 relative z-10 w-full">
        {/* Back Link */}
        <Link 
            href="/blog" 
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-12"
        >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
            Back to Hub
        </Link>
        
        {/* Post Header */}
        <header className="mb-16 border-b border-border pb-16">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-full mb-8 inline-block shadow-sm">
                Retail Tactics
            </span>
            <h1 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter uppercase leading-tight">
                {post.title}
            </h1>
            <div className="flex items-center justify-between text-muted-foreground font-bold">
                <p className="text-lg md:text-xl max-w-2xl leading-relaxed">{post.excerpt}</p>
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block whitespace-nowrap ml-8">
                    {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
            </div>
        </header>

        {/* Post Content (MVP JSON parsing rendering) */}
        <article className="prose prose-invert prose-lg max-w-none text-muted-foreground font-bold leading-relaxed space-y-8">
             {post.content.split('\n\n').map((paragraph, idx) => {
                 if (paragraph.startsWith('###')) {
                     return <h3 key={idx} className="text-2xl font-black uppercase tracking-tight text-foreground mt-12 mb-4">{paragraph.replace('###', '').trim()}</h3>
                 }
                 return <p key={idx}>{paragraph}</p>
             })}
        </article>
      </div>

      {/* Lead Magnet CTA */}
      <div className="border-t border-border bg-muted/20 w-full py-24 relative z-10 text-center">
            <div className="max-w-3xl mx-auto px-6">
                <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 text-foreground italic">Stop Giving Away Margins.</h3>
                <p className="text-muted-foreground font-bold text-lg mb-8">Download our Free Mobile Shop Profit Margin Calculator (Excel) to see exactly which accessories make you the most money.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto">
                    <input type="email" placeholder="Enter your business email" className="w-full sm:w-2/3 px-6 py-4 rounded-2xl border border-border bg-card/50 backdrop-blur-md text-foreground placeholder:text-muted-foreground font-bold focus:outline-none focus:border-primary/50 transition-colors" />
                    <button className="w-full sm:w-1/3 px-6 py-4 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all">
                        Get Calculator
                    </button>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-6 opacity-50">100% Free. No strings attached.</p>
            </div>
      </div>

      <Footer compact={false} />
    </div>
  );
}
