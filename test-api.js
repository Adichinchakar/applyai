async function test() {
    const res = await fetch('http://localhost:3000/api/jobs/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: '09098609-12ec-4fb7-80fe-09f5275e9adf' })
    });
    const data = await res.json();
    console.log("FULL ERROR DATA:", JSON.stringify(data, null, 2));
}
test();
