import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import { mdxComponents } from "@/components/mdx";
import type { LoadedMdx } from "./loader";

export async function compileTaskMdx(source: LoadedMdx) {
  return compileMDX({
    source: source.body,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
          [rehypePrettyCode, { theme: "github-dark-dimmed" }],
        ],
      },
    },
    components: mdxComponents,
  });
}
