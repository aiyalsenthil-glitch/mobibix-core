import Link from "next/link";

interface BreadcrumbItem {
  name: string;
  item: string; 
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((breadcrumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": breadcrumb.name,
      "item": breadcrumb.item
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground flex-wrap gap-y-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={item.item} className="flex items-center">
                {isLast ? (
                  <span className="text-foreground" aria-current="page">
                    {item.name}
                  </span>
                ) : (
                  <>
                    <Link 
                      href={item.item}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {item.name}
                    </Link>
                    <svg
                      className="w-3 h-3 mx-2 text-border flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
