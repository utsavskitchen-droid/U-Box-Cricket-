import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("cricket.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    photo TEXT,
    matches INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    balls INTEGER DEFAULT 0,
    wickets INTEGER DEFAULT 0,
    fours INTEGER DEFAULT 0,
    hit_map TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    score_a INTEGER DEFAULT 0,
    score_b INTEGER DEFAULT 0,
    wickets_a INTEGER DEFAULT 0,
    wickets_b INTEGER DEFAULT 0,
    overs_a TEXT DEFAULT '0.0',
    overs_b TEXT DEFAULT '0.0',
    winner TEXT,
    player_stats TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Migration: Add player_stats if it doesn't exist
  PRAGMA table_info(matches);
`);

try {
  db.exec("ALTER TABLE matches ADD COLUMN player_stats TEXT");
} catch (e) {
  // Column likely already exists
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get("/api/players", (req, res) => {
    const players = db.prepare("SELECT * FROM players").all();
    res.json(players);
  });

  app.get("/api/matches", (req, res) => {
    const matches = db.prepare("SELECT * FROM matches ORDER BY date DESC").all();
    res.json(matches);
  });

  app.get("/api/export", (req, res) => {
    const players = db.prepare("SELECT * FROM players").all();
    const matches = db.prepare("SELECT * FROM matches").all();
    res.json({ players, matches, exportedAt: new Date().toISOString() });
  });

  app.post("/api/players", (req, res) => {
    const { name, photo } = req.body;
    const info = db.prepare("INSERT INTO players (name, photo) VALUES (?, ?)").run(name, photo);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/players/:id", (req, res) => {
    db.prepare("DELETE FROM players WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/match/finish", (req, res) => {
    const { teamA, teamB, scoreA, scoreB, wicketsA, wicketsB, oversA, oversB, winner, playerStats } = req.body;
    
    // Save match
    db.prepare(`
      INSERT INTO matches (team_a, team_b, score_a, score_b, wickets_a, wickets_b, overs_a, overs_b, winner, player_stats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      JSON.stringify(teamA), 
      JSON.stringify(teamB), 
      scoreA, 
      scoreB, 
      wicketsA, 
      wicketsB, 
      oversA, 
      oversB, 
      winner, 
      JSON.stringify(playerStats)
    );

    // Update player stats
    const updateStmt = db.prepare(`
      UPDATE players 
      SET matches = matches + 1,
          runs = runs + ?,
          balls = balls + ?,
          wickets = wickets + ?,
          fours = fours + ?,
          hit_map = ?
      WHERE id = ?
    `);

    for (const stat of playerStats) {
      const player = db.prepare("SELECT hit_map FROM players WHERE id = ?").get(stat.id);
      let currentHitMap = JSON.parse(player.hit_map || '{}');
      
      // Merge hit maps
      if (stat.hitMap && Array.isArray(stat.hitMap)) {
        const existingHitMap = JSON.parse(player.hit_map || '[]');
        const newHitMap = [...existingHitMap, ...stat.hitMap];
        updateStmt.run(stat.runs, stat.balls, stat.wickets, stat.fours, JSON.stringify(newHitMap), stat.id);
      } else {
        updateStmt.run(stat.runs, stat.balls, stat.wickets, stat.fours, player.hit_map || '[]', stat.id);
      }
    }

    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
