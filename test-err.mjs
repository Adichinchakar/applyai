import fs from 'fs';

async function runTests() {
    const res = await fetch('http://localhost:3002/api/jobs');
    const data = await res.json();
    const jobs = data.jobs || [];

    if (jobs.length === 0) {
        console.log('No jobs found to test scoring.');
        return;
    }
    const job = jobs[0];

    console.log(`Testing Research on ${job.id}`);
    const res2 = await fetch('http://localhost:3002/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
    });
    if (!res2.ok) fs.writeFileSync('err-research.txt', await res2.text());

    console.log(`Testing Cover Letter on ${job.id}`);
    const res3 = await fetch('http://localhost:3002/api/generate/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
    });
    if (!res3.ok) fs.writeFileSync('err-cover.txt', await res3.text());

    console.log('Done');
}
runTests();
