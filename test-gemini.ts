import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
    const genAI = new GoogleGenerativeAI('AIzaSyCxu2uwfFmLQpcHamfx6p8302l4mK6M4nQ');
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'object' as any,
                properties: {
                    overall: { type: 'number' as any },
                    seniorityMatch: { type: 'string' as any, enum: ['perfect', 'stretch', 'overqualified'] }
                },
                required: ['overall', 'seniorityMatch'],
            },
        },
    });

    try {
        const response = await model.generateContent("Test prompt. Give me an overall score of 8 and perfect seniority.");
        console.log(response.response.text());
    } catch (e: any) {
        console.log("ERROR MESSAGE:", e?.message);
        console.log("ERROR STACK:", e?.stack);
        console.log("ERROR DETAILS:", JSON.stringify(e, null, 2));
    }
}

test();
