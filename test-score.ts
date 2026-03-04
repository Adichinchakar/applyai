import { scoreJobFit } from './src/lib/scoring/fit-scorer';

async function testScore() {
    try {
        const res = await scoreJobFit(
            "Senior Frontend Engineer",
            "Vercel",
            "We are looking for a Next.js expert with 5+ years of experience."
        );
        console.log("SUCCESS:", res);
    } catch (e) {
        console.error("FAILED:", e);
    }
}

testScore();
