import fs from 'fs';
import path from 'path';

// Using a simple JSON structure for MVP blog post reading instead of full Markdown remark.
// In a full production app, you might use 'gray-matter' and 'remark'.

type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string; // Markdown or raw text
};

export function getAllPosts(): BlogPost[] {
  const postsDirectory = path.join(process.cwd(), 'content/blog');
  
  // Guard check if directory exists
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.json$/, '');
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    
    const parsedData = JSON.parse(fileContents) as BlogPost;
    return parsedData;
  });

  // Sort posts by date
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getPostBySlug(slug: string): BlogPost | null {
  const postsDirectory = path.join(process.cwd(), 'content/blog');
  const fullPath = path.join(postsDirectory, `${slug}.json`);
  
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(fileContents) as BlogPost;
}
