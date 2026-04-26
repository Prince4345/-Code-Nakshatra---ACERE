
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, ".env.local");
let apiKey = "";
try {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
    if (match) apiKey = match[1].trim();
} catch (e) {
    console.error("Could not read .env.local");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function runAgent(name: string, promptInfo: { path: string, isSystem: boolean }, input: string) {
    console.log(`\n--- Running ${name} ---`);
    const promptPath = path.join(__dirname, promptInfo.path);
    const promptText = fs.readFileSync(promptPath, "utf-8");

    const config: any = {
        temperature: 0.0,
    };

    let content = input;

    if (promptInfo.isSystem) {
        config.systemInstruction = promptText;
    } else {
        // If we treat it as part of the prompt (not system instruction)
        content = promptText + "\n\nINPUT:\n" + input;
    }

    // For AERCE_CORE, we want strict JSON
    if (name === "AERCE_CORE") {
        config.responseMimeType = "application/json";
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: content,
            config: config
        });

        const output = response.text;
        console.log(`Output: ${output?.substring(0, 100)}...`);
        return output || "";
    } catch (e) {
        console.error(`Error in ${name}:`, e);
        return "";
    }
}

async function runPipelineOnce(rawInput: string) {
    // Step 1: Input Parser
    const parserOutput = await runAgent("Input Parser", { path: "aerce/agents/input_parser.prompt", isSystem: true }, rawInput);

    // Step 2: Field Validator
    const validatorOutput = await runAgent("Field Validator", { path: "aerce/agents/field_validator.prompt", isSystem: true }, parserOutput);

    // Step 3: Applicability Classifier
    const applicabilityOutput = await runAgent("Applicability Classifier", { path: "aerce/agents/applicability_classifier.prompt", isSystem: true }, parserOutput);

    // Step 4: AERCE_CORE
    const coreContext = `
ADVISORY AGENT REPORTS:
---
[INPUT PARSER]
${parserOutput}
---
[FIELD VALIDATOR]
${validatorOutput}
---
[APPLICABILITY CLASSIFIER]
${applicabilityOutput}
---
`;

    const coreInput = coreContext + `\n\nOFFICIAL RAW INPUT:\n${rawInput}`;

    return await runAgent("AERCE_CORE", { path: "aerce/core/AERCE_CORE.prompt", isSystem: true }, coreInput);
}

async function main() {
    const rawInput = "Steel rods exported to Germany.\nInvoice INV-010.\nNo energy data provided.";


    const versionPath = path.join(__dirname, "aerce/core/AERCE_CORE_VERSION.md");
    try {
        const versionContent = fs.readFileSync(versionPath, "utf-8");
        const versionMatch = versionContent.match(/Current Version: (v\d+\.\d+\.\d+)/);
        if (versionMatch) {
            console.log(`System Version: ${versionMatch[1]}`);
        } else {
            console.log("System Version: UNKNOWN");
        }
    } catch (e) {
        console.log("System Version: RECORD NOT FOUND");
    }

    console.log("=== RUN 1 ===");
    const output1 = await runPipelineOnce(rawInput);
    console.log("\nOutput 1:", output1);

    console.log("\n=== RUN 2 ===");
    const output2 = await runPipelineOnce(rawInput);
    console.log("\nOutput 2:", output2);

    console.log("\n=== VERIFICATION ===");
    // Normalize newlines for comparison
    const norm1 = output1.replace(/\r\n/g, "\n").trim();
    const norm2 = output2.replace(/\r\n/g, "\n").trim();

    if (norm1 === norm2) {
        console.log("✅ SUCCESS: Outputs are identical.");
    } else {
        console.error("❌ FAILURE: Outputs differ.");
        // Simple diff check for JSON
        try {
            const j1 = JSON.parse(norm1);
            const j2 = JSON.parse(norm2);
            if (JSON.stringify(j1) === JSON.stringify(j2)) {
                console.log("✅ SUCCESS: JSON content is identical (ignoring whitespace).");
            } else {
                console.error("❌ FAILURE: JSON content differs.");
            }
        } catch (e) {
            console.error("Could not parse JSON for comparison.");
        }
    }
}

main();
