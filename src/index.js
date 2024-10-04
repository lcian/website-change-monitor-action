import github from "@actions/github";
import axios from "axios";
import * as cheerio from "cheerio";
import crypto from "crypto";

const URL = process.env["INPUT_URL"];
const SELECTOR = process.env["INPUT_SELECTOR"];

const DISCORD_WEBHOOK_URL = process.env["INPUT_DISCORD-WEBHOOK-URL"];
const SLACK_WEBHOOK_URL = process.env["INPUT_SLACK-WEBHOOK-URL"];

async function getContentHash(url, selector) {
    let html;
    try {
        html = await axios.get(url).then((res) => res.data);
    } catch (error) {
        console.error(`Error fetching URL ${URL}:`, error);
        process.exit(1);
    }

    let content = "";
    if (selector) {
        const $ = cheerio.load(html);
        const elements = $(selector);
        for (const element of elements) {
            content += $(element).html();
        }
    } else {
        content = html;
    }

    const hash = crypto.createHash("sha256").update(content).digest("base64");
    return hash;
}

async function getLastContentHash() {
    const octokit = github.getOctokit(process.env.GH_TOKEN);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

    const actionId = crypto.createHash("sha256").update(process.env.GITHUB_ACTION).digest("hex");
    const variable = `__WEBSITE_CHANGE_MONITOR_ACTION__${actionId}`;

    try {
        const res = await octokit.request(`GET /repos/${owner}/${repo}/actions/variables/${variable}`, {
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
        return res.data.value;
    } catch (error) {
        return null;
    }
}

async function saveContentHash(hash) {
    const octokit = github.getOctokit(process.env.GH_TOKEN);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");

    const actionId = crypto.createHash("sha256").update(process.env.GITHUB_ACTION).digest("hex");
    const variableName = `__WEBSITE_CHANGE_MONITOR_ACTION__${actionId}`;

    let shouldCreate = true;
    const response = await octokit.request(`GET /repos/${owner}/${repo}/actions/variables`, {
        headers: {
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });

    for (const repoVariable of response.data.variables) {
        if (repoVariable.name.toUpperCase() === variableName.toUpperCase()) {
            shouldCreate = false;
            break;
        }
    }

    if (shouldCreate) {
        await octokit.request(`POST /repos/${owner}/${repo}/actions/variables`, {
            name: variableName,
            value: hash,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
    } else {
        await octokit.request(`PATCH /repos/${owner}/${repo}/actions/variables/${variableName}`, {
            value: hash,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });
    }
}

async function notifyDiscord(url, content) {
    await axios.post(url, { content }, { headers: { "Content-Type": "application/json" } });
}

async function notifySlack(url, content) {
    await axios.post(url, { text: content }, { headers: { "Content-Type": "application/json" } });
}

async function notify(url) {
    const content = `Website ${url} has changed!`;
    if (DISCORD_WEBHOOK_URL) {
        await notifyDiscord(DISCORD_WEBHOOK_URL, content);
    }
    if (SLACK_WEBHOOK_URL) {
        await notifySlack(SLACK_WEBHOOK_URL, content);
    }
}

async function main() {
    const hash = await getContentHash(URL, SELECTOR);
    const previousHash = await getLastContentHash(URL);
    if (hash === previousHash) {
        console.log("No changes detected.");
        return;
    } else {
        console.log("Changes detected. Sending notification.");
        await Promise.all([notify(URL), saveContentHash(hash)]);
    }
}

main();
