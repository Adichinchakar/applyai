import { DiscoveredJob, ATSType, RemoteType } from '@/types';

interface RemotiveJob {
    id: number;
    url: string;
    title: string;
    company_name: string;
    category: string;
    candidate_required_location: string;
    salary: string;
    description: string;
    publication_date: string;
}

function detectATS(url: string): ATSType {
    if (url.includes('greenhouse.io')) return 'greenhouse';
    if (url.includes('lever.co')) return 'lever';
    if (url.includes('myworkdayjobs.com')) return 'workday';
    if (url.includes('linkedin.com')) return 'linkedin';
    return 'generic';
}

function parseSalary(salaryStr: string): { min?: number; max?: number } {
    if (!salaryStr) return {};
    const match = salaryStr.match(/\$?(\d[\d,]+)\s*[-–to]+\s*\$?(\d[\d,]+)/i);
    if (!match) return {};
    const parse = (s: string) => parseInt(s.replace(/,/g, ''), 10);
    return { min: parse(match[1]), max: parse(match[2]) };
}

export async function discoverRemotiveJobs(): Promise<DiscoveredJob[]> {
    const discovered: DiscoveredJob[] = [];

    try {
        const res = await fetch(
            'https://remotive.com/api/remote-jobs?category=Design&limit=50',
            {
                headers: { 'User-Agent': 'ApplyAI/1.0' },
                signal: AbortSignal.timeout(12000),
            }
        );
        if (!res.ok) return [];

        const data = await res.json() as { jobs: RemotiveJob[] };
        const jobs = data.jobs || [];

        const DESIGN_KEYWORDS = ['designer', 'ux', 'ui', 'design lead', 'product design', 'visual design', 'interaction'];

        for (const job of jobs) {
            const titleLower = job.title.toLowerCase();
            const isDesign = DESIGN_KEYWORDS.some(kw => titleLower.includes(kw));
            if (!isDesign) continue;

            const salary = parseSalary(job.salary || '');
            const cleanDescription = (job.description || '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 4000);

            discovered.push({
                title: job.title,
                company: job.company_name,
                location: job.candidate_required_location || 'Remote',
                jobUrl: job.url,
                postedAt: job.publication_date ? new Date(job.publication_date).toISOString() : undefined,
                jdRaw: cleanDescription,
                atsType: detectATS(job.url),
                remoteType: 'remote' as RemoteType, // Remotive is remote-only
                salaryMin: salary.min,
                salaryMax: salary.max,
            });
        }
    } catch {
        // Fail silently — other sources continue
    }

    return discovered;
}
