import fs from 'fs';

async function runApplyTest() {
    const res = await fetch('http://localhost:3002/api/jobs');
    const data = await res.json();
    const jobs = data.jobs || [];

    if (jobs.length === 0) {
        console.log('No jobs found to test apply.');
        return;
    }
    const job = jobs[0];

    console.log(`Testing Apply on ${job.id}`);
    const res2 = await fetch('http://localhost:3002/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
    });

    if (!res2.ok) {
        fs.writeFileSync('err-apply.txt', await res2.text());
        console.log('Apply Failed!');
    } else {
        // Stream
        const reader = res2.body.getReader();
        const { value, done } = await reader.read();
        console.log('Apply Stream Started:', new TextDecoder().decode(value).substring(0, 100));
    }

    console.log('Apply script finished initiating.');
}
runApplyTest();
