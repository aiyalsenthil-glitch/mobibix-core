import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { getAllPosts, getPostBySlug } from "../../../lib/blog";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "../../../components/layout/Breadcrumbs";

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
    keywords: post.keywords,
    authors: post.author ? [{ name: post.author }] : [{ name: 'MobiBix' }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      authors: post.author ? [post.author] : ["MobiBix"],
    },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": post.title,
            "description": post.excerpt,
            "datePublished": post.date,
            "author": {
              "@type": "Organization",
              "name": post.author || "Mobibix"
            }
          })
        }}
      />
      <Header />
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none text-center">
        <div className="absolute top-[10%] right-[-20%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[40%] left-[-20%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto max-w-4xl pt-44 pb-32 px-6 relative z-10 w-full">
        <Breadcrumbs 
          items={[
            { name: "Home", item: "https://REMOVED_DOMAIN/" },
            { name: "Blog", item: "https://REMOVED_DOMAIN/blog" },
            { name: post.title, item: `https://REMOVED_DOMAIN/blog/${post.slug}` }
          ]} 
        />
        
        {/* Post Header */}
        <header className="mb-16 border-b border-border pb-16">
            <div className="flex flex-col gap-3 mb-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-full inline-block shadow-sm w-fit">
                    Retail Tactics
                </span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    By {post.author || "Mobibix"}
                </span>
            </div>
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

        {/* Post Content (Improved JSON parsing rendering) */}
        <article className="prose prose-invert prose-lg max-w-none text-muted-foreground font-bold leading-relaxed">
             {post.content.split('\n\n').map((block, idx) => {
                 // Headers
                 if (block.startsWith('###')) {
                     return <h3 key={idx} className="text-2xl font-black uppercase tracking-tight text-foreground mt-12 mb-6">{block.replace('###', '').trim()}</h3>
                 }
                 if (block.startsWith('##')) {
                    return <h2 key={idx} className="text-3xl font-black uppercase tracking-tight text-foreground mt-16 mb-8">{block.replace('##', '').trim()}</h2>
                 }

                 // Lists
                 if (block.includes('\n* ') || block.startsWith('* ')) {
                    const items = block.split('\n').map(item => item.replace('* ', '').replace('-', '').trim()).filter(Boolean);
                    return (
                        <ul key={idx} className="space-y-4 my-8 list-none p-0">
                            {items.map((item, i) => (
                                <li key={i} className="flex gap-4 items-start text-lg">
                                    <span className="text-primary mt-1">✦</span>
                                    <span>
                                        {/* Simple bold replacement */}
                                        {item.split('**').map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="text-foreground">{part}</strong> : part)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    );
                 }

                 // Standard Paragraphs with bold support
                 return (
                    <p key={idx} className="mb-6">
                        {block.split('**').map((part, pidx) => pidx % 2 === 1 ? <strong key={pidx} className="text-foreground">{part}</strong> : part)}
                    </p>
                 );
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

      {/* Recent Articles Section (Improved internal linking) */}
      <div className="container mx-auto max-w-4xl pb-32 px-6 relative z-10">
          <div className="flex items-center justify-between mb-12 border-b border-border pb-6">
              <h2 className="text-2xl font-black uppercase tracking-tight">Recent Articles</h2>
              <Link href="/blog" className="text-xs font-black uppercase tracking-widest text-primary hover:underline">View All</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {getAllPosts().filter(p => p.slug !== post.slug).slice(0, 4).map((related) => (
                  <Link key={related.slug} href={`/blog/${related.slug}`} className="group block space-y-4">
                      <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                              {new Date(related.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <h3 className="text-xl font-black uppercase tracking-tighter leading-tight group-hover:text-primary transition-colors line-clamp-2">
                              {related.title}
                          </h3>
                          <p className="text-sm text-muted-foreground font-bold line-clamp-2 leading-relaxed">
                              {related.excerpt}
                          </p>
                      </div>
                  </Link>
              ))}
          </div>
      </div>

      <Footer compact={false} />

    </div>
  );
}
