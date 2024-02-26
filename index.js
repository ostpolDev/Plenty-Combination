import 'dotenv/config'
import express from "express";
import OpenAI from "openai";
import * as fs from "fs";
import { Knex } from "./database.js";

// Load the prompt.txt file
let prompt = fs.readFileSync("./prompt.txt", "utf-8");
// Remove new lines and trim prompt file contents
prompt = prompt.replace(/\r\n/g, " ").trim();

// OpenAI instance
const openai = new OpenAI({apiKey: process.env.ELEMENT_AI_API_KEY});

/**
 * Combine two given elements by their name using GPT
 * @param {string} a Name of the first element
 * @param {string} b Name of the second element
 * @returns {boolean|object} The newly created object or false on error
 */
async function CombineElements(a, b) {
    try {

        // Make the OpenAI request
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: prompt // prompt.txt file content
                },
                {
                    role: "user",
                    content: [a,b].join(",") // The two given elements; comma separated
                }
            ],
            model: "gpt-3.5-turbo",
            response_format: {
                type: "json_object"
            }
        })

        let message = completion.choices[0].message.content;
        if (!message) {
            return false;
        }

        // Parse the outputted text to JSON
        let json = JSON.parse(message);
        // Check if the new JSON object contains all the fields we need
        if (json.object && typeof json.success != "undefined" && json.emoji) {
            // Return the new object or false if the success parameter is false
            return json.success ? json : false;
        }

        return false;

    } catch (e) {
        console.error(e);
        return false;
    }
}

const app = express();

// Public directory where all the front-end game code is
app.use(express.static("./public"));

// The API route for combining elements
app.get("/element", async (req, res) => {

    // Get the two elements to combine
    let elemA = req.query.a;
    let elemB = req.query.b;

    if (!elemA || !elemB) {
        return res.json({success: false});
    }

    try {

        // Generate a base64 id for the two elements. They get put
        // into an array and sorted so that the order doesn't matter.
        let id = [elemA, elemB].sort().join("").trim();
        id = Buffer.from(id).toString("base64");

        // Check if the database already contains this combination
        let existing = await Knex("Elements").where({id});
        if (existing[0]) {
            // Return the existing database entry
            return res.json({
                success: true,
                a: elemA,
                b: elemB,
                element: {
                    object: existing[0].name,
                    emoji: existing[0].emoji,
                    success: true
                },
                // This parameter is only true if the element didn't already exist in the database
                isNew: false
            })
        }

        // Create a new combination using GPT-3.5
        let combination = await CombineElements(elemA, elemB);
        if (!combination) {
            // Combination didn't work...
            return res.json({success: false});
        }

        // Insert the newly created element into the database for future use
        await Knex("Elements").insert({
            id,
            emoji: combination.emoji,
            name: combination.object,
            element_a: elemA,
            element_b: elemB
        })

        // Return the newly created element
        return res.json({
            success: true,
            a: elemA,
            b: elemB,
            element: combination,
            isNew: true
        })

    } catch (e) {
        // Super good error handeling
        console.error(e);
        return res.json({success: false});
    }

})

const PORT = process.env.ELEMENT_HOST_PORT || 3000;
const HOSTNAME = process.env.ELEMENT_HOSTNAME || "127.0.0.1"

// Hosting the app locally
app.listen(PORT, HOSTNAME, () => {
    console.log(`App listening on http://${HOSTNAME}:${PORT}/`);
})
