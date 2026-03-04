import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['playwright', 'pdf-parse'],
  // Include data/ directory in Vercel serverless bundles so resume.md is
  // accessible at runtime via fs.readFileSync(path.join(process.cwd(), 'data/resume.md'))
  outputFileTracingIncludes: {
    '/api/jobs/score': ['./data/**/*'],
    '/api/jobs/score-batch': ['./data/**/*'],
    '/api/generate/cover-letter': ['./data/**/*'],
    '/api/generate/resume': ['./data/**/*'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons/**',
      },
    ],
  },
};

export default nextConfig;
