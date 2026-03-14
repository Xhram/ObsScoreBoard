import express from "express";
import path from "path";
import fs from "fs";
import postcss from "postcss";
import postcssNested from "postcss-nested";
import { PING_INTERVAL_MS } from "../config/index.js";


export function setupRoutes(app, stateManager) {
    app.use((req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        );
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Requested-With"
        );
        res.setHeader("Access-Control-Allow-Credentials", "false");
        if (req.method === "OPTIONS") {
            return res.sendStatus(204);
        }
        next();
    });


    app.get("/", (req, res) => {
        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ObsScoreBoard</title>
    <style>
        :root {
            --bg: #0b0f14;
            --panel: #121922;
            --panel-border: #273241;
            --text: #e8eef5;
            --muted: #98a7b8;
            --accent: #4ea1ff;
            --accent-2: #57d5a1;
        }

        * { box-sizing: border-box; }

        html, body {
            margin: 0;
            padding: 0;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            background: radial-gradient(circle at 20% -20%, #1b2735 0%, var(--bg) 55%);
            color: var(--text);
            min-height: 100vh;
        }

        .wrap {
            width: min(1100px, calc(100% - 28px));
            margin: 24px auto 36px;
        }

        .hero {
            background: linear-gradient(150deg, #172230 0%, #101824 65%);
            border: 1px solid var(--panel-border);
            border-radius: 14px;
            padding: 20px;
            margin-bottom: 14px;
        }

        h1 {
            margin: 0;
            font-size: 32px;
            letter-spacing: 0.2px;
        }

        .subtitle {
            margin: 8px 0 0;
            color: var(--muted);
            line-height: 1.5;
            max-width: 760px;
        }

        .chip-row {
            margin-top: 14px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .chip {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border: 1px solid #324155;
            border-radius: 999px;
            background: #101824;
            color: #c7d3e0;
            font-size: 12px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 10px;
        }

        .card {
            display: block;
            text-decoration: none;
            color: inherit;
            background: var(--panel);
            border: 1px solid var(--panel-border);
            border-radius: 12px;
            padding: 14px;
            transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
        }

        .card:hover {
            transform: translateY(-2px);
            border-color: #406289;
            background: #152030;
        }

        .card-title {
            margin: 0;
            font-size: 16px;
            font-weight: 700;
        }

        .card-copy {
            margin: 8px 0 0;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.45;
        }

        .footer {
            margin-top: 12px;
            color: #8ea0b4;
            font-size: 12px;
        }

        .footer strong {
            color: var(--accent-2);
            font-weight: 700;
        }
    </style>
</head>
<body>
    <main class="wrap">
        <section class="hero">
            <h1>ObsScoreBoard Control Center</h1>
            <p class="subtitle">
                Launch your overlays, control game state, and manage player stats from one place.
                Use the links below to open the exact view you need.
            </p>
            <div class="chip-row">
                <span class="chip">WebSocket Live Sync</span>
                <span class="chip">Scoreboard + Admin</span>
                <span class="chip">Player Stats Tools</span>
            </div>
        </section>

        <section class="grid" aria-label="Navigation">
            <a class="card" href="/scoreboard">
                <h2 class="card-title">Scoreboard</h2>
                <p class="card-copy">Primary on-screen overlay with clocks, score, possession, and flag state.</p>
            </a>
            <a class="card" href="/admin">
                <h2 class="card-title">Admin Panel</h2>
                <p class="card-copy">Main game controls for scores, timers, possession, visibility, team settings, and flags.</p>
            </a>
            <a class="card" href="/player-stats-admin">
                <h2 class="card-title">Player Stats Admin</h2>
                <p class="card-copy">Dedicated page for editing player stats and issuing player flag/review actions.</p>
            </a>
            <a class="card" href="/player-stats">
                <h2 class="card-title">Player Stats View</h2>
                <p class="card-copy">Read-only display page for player stat output.</p>
            </a>
            <a class="card" href="/announcer">
                <h2 class="card-title">Announcer</h2>
                <p class="card-copy">Announcer-facing interface and stat display tools.</p>
            </a>
        </section>

        <p class="footer">Server status: <strong>online</strong></p>
    </main>
</body>
</html>`);
    });
    
    // Custom PostCSS middleware for scoreboard CSS files
    app.get("/scoreboard/style/:filename", async (req, res) => {
        try {
            const filename = req.params.filename;
            if (!filename.endsWith('.css')) {
                return res.status(400).send('Invalid file type');
            }
            const cssPath = path.join("./", 'frontend', 'scoreboard', 'style', filename);
            if (!fs.existsSync(cssPath)) {
                return res.status(404).send('CSS file not found');
            }
            
            const css = fs.readFileSync(cssPath, 'utf8');
            const result = await postcss([postcssNested]).process(css, { from: cssPath });
            
            res.setHeader('Content-Type', 'text/css');
            res.send(result.css);
        } catch (error) {
            console.error('PostCSS processing error:', error);
            res.status(500).send('CSS processing error');
        }
    });

    app.get("/api/player-stats/both", (req, res) => {
        return res.json({
            home: stateManager.getSortedTeamRoster("home"),
            away: stateManager.getSortedTeamRoster("away"),
        });
    });

    app.get("/api/player-stats/meta", (req, res) => {
        return res.json({
            home: {
                name: stateManager.scoreboard.homeTeam.name,
                color: stateManager.scoreboard.homeTeam.color,
            },
            away: {
                name: stateManager.scoreboard.awayTeam.name,
                color: stateManager.scoreboard.awayTeam.color,
            },
        });
    });

    app.get("/api/player-stats/:team", (req, res) => {
        const team = req.params.team;
        if (team !== "home" && team !== "away") {
            return res.status(400).send("Invalid team");
        }
        return res.json(stateManager.getSortedTeamRoster(team));
    });

    app.get("/api/player-stats/display/settings", (req, res) => {
        return res.json(stateManager.scoreboard.playerStats.display);
    });

    app.get("/config", (req, res) => {
        res.send(JSON.stringify({
            PING_INTERVAL_MS: PING_INTERVAL_MS
        }, null, 4));
    });
    
    app.use("/scoreboard", express.static("./frontend/scoreboard"));
    app.use("/admin", express.static("./frontend/admin"));
    app.use("/common", express.static("./frontend/common"));
    app.use("/player-stats", express.static("./frontend/player-stats"));
    app.use("/player-stats-admin", express.static("./frontend/player-stats-admin"));
    app.use("/announcer", express.static("./frontend/announcer"));
}

