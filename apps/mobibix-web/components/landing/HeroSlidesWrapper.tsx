"use client";

import dynamic from "next/dynamic";
import type { getAllPosts } from "../../lib/blog";

type BlogPost = ReturnType<typeof getAllPosts>[number];

const HeroSlidesClient = dynamic(
  () => import("./HeroSlidesClient").then((m) => m.HeroSlidesClient),
  { ssr: false }
);

export function HeroSlidesWrapper({ posts }: { posts: BlogPost[] }) {
  return <HeroSlidesClient posts={posts} />;
}
