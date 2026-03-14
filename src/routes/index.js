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
        res.send("Server is running <br> <a href='/scoreboard'>Scoreboard</a> <br> <a href='/admin'>Admin</a>");
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
    app.use("/announcer", express.static("./frontend/announcer"));
}

