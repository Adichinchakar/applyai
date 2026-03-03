import fs from 'fs';
import path from 'path';

async function runTests() {
    // Test Discovery
    console.log('--- Testing Discovery ---');
    let jobs = [];
    try {
        const res = await fetch('http://localhost:3002/api/jobs/discover', { method: 'POST' });
        const data = await res.json();
        console.log(`Discovered ${data.jobs?.length} jobs`);
        jobs = data.jobs || [];
    } catch (e) {
        console.error('Discovery Failed:', e);
    }

    // Get all jobs to test scoring
    try {
        const res = await fetch('http://localhost:3002/api/jobs');
        const data = await res.json();
        jobs = data.jobs || jobs;
    } catch (e) {
        console.error('Failed to fetch jobs', e);
    }

    if (jobs.length === 0) {
        console.log('No jobs found to test scoring.');
        return;
    }

    const job = jobs[0];
    console.log(`\n--- Testing Scoring on Job: ${job.id} ---`);
    try {
        const res = await fetch('http://localhost:3002/api/jobs/score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: job.id })
        });
        const data = await res.json();
        console.log('Scoring Result:', data.fitScore, data.applyRecommendation);
    } catch (e) {
        console.error('Scoring Failed:', e);
    }

    console.log(`\n--- Testing Company Research on Job: ${job.id} ---`);
    try {
        const res = await fetch('http://localhost:3002/api/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: job.id })
        });
        if (!res.ok) {
            console.error('Research Failed HTTP:', res.status, await res.text());
        } else {
            const data = await res.json();
            console.log('Research Result:', data.research ? 'Success' : 'Failed');
        }
    } catch (e) {
        console.error('Research Failed:', e);
    }

    console.log(`\n--- Testing Cover Letter Generation on Job: ${job.id} ---`);
    try {
        const res = await fetch('http://localhost:3002/api/generate/cover-letter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: job.id })
        });
        // It's a stream
        if (res.ok) {
            console.log('Cover Letter Stream Started Successfully');
            // Read just a little bit of the stream to verify content
            const reader = res.body.getReader();
            const { value, done } = await reader.read();
            console.log('Stream chunk:', new TextDecoder().decode(value).substring(0, 50) + '...');
        } else {
            console.error('Cover Letter Generation Failed:', res.status, await res.text());
        }
    } catch (e) {
        console.error('Cover Letter Generation Failed:', e);
    }
}

runTests();
