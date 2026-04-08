"use client";

import dynamic from "next/dynamic";
import type { getAllPosts } from "../../lib/blog";
import { HeroSectionStatic } from "./sections/HeroSectionStatic";

type BlogPost = ReturnType<typeof getAllPosts>[number];

const HeroSlidesClient = dynamic(
  () => import("./HeroSlidesClient").then((m) => m.HeroSlidesClient),
  { 
    ssr: false,
    loading: () => <HeroSectionStatic />
  }
);

export function HeroSlidesWrapper({ posts }: { posts: BlogPost[] }) {
  return <HeroSlidesClient posts={posts} />;
}
