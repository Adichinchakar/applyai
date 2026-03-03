import { DiscoveredJob, ATSType, RemoteType } from '@/types';

function detectATS(url: string): ATSType {
    if (!url) return 'generic';
    if (url.includes('greenhouse.io')) return 'greenhouse';
    if (url.includes('lever.co')) return 'lever';
    if (url.includes('myworkdayjobs.com')) return 'workday';
    if (url.includes('linkedin.com')) return 'linkedin';
    return 'generic';
}

function detectRemoteType(title: string, description: string): RemoteType {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('remote') && !text.includes('hybrid')) return 'remote';
    if (text.includes('hybrid')) return 'hybrid';
    if (text.includes('onsite') || text.includes('on-site') || text.includes('in-office')) return 'onsite';
    if (text.includes('remote')) return 'remote';
    return 'unknown';
}

export async function discoverRemoteOKJobs(
    roles: string[]
): Promise<DiscoveredJob[]> {
    const discovered: DiscoveredJob[] = [];

    // Try fetching the generic designer tags to avoid zero results
    const tagsToTry = ['product-design', 'ux', 'ui-ux', 'design-systems', 'figma'];
    const validTitleKeywords = ['designer', 'ux', 'ui', 'product design', 'design lead'];

    for (const tag of tagsToTry) {
        try {
            const url = `https://remoteok.com/api?tags=${tag}`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) continue;

            const jobs = await response.json();

            // The first item in the remoteOK array is legal/stat data usually
            for (const item of jobs) {
                if (item.legal) continue;

                const positionTitle = (item.position || '').toLowerCase();
                const isValidDesignRole = validTitleKeywords.some(keyword => positionTitle.includes(keyword));

                if (!isValidDesignRole) continue;

                try {
                    discovered.push({
                        title: item.position || 'Unknown Role',
                        company: item.company || 'Unknown Company',
                        location: item.location || 'Remote',
                        jobUrl: item.url || item.apply_url || '',
                        postedAt: item.date,
                        jdRaw: item.description,
                        atsType: detectATS(item.url || item.apply_url || ''),
                        remoteType: detectRemoteType(item.position || '', item.description || ''),
                        salaryMin: item.salary_min,
                        salaryMax: item.salary_max,
                    });
                } catch {
                    // Skip parsing error
                }
            }
        } catch {
            // Skip network error for this tag
        }
    }

    return discovered;
}
