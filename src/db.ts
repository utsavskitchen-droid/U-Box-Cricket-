import { openDB, IDBPDatabase } from 'idb';

export interface Player {
  id: number;
  name: string;
  photo?: Blob;
  runs: number;
  balls: number;
  matches: number;
  wickets: number;
  hit_map: { x: number, y: number }[];
  // Bowling stats
  bowlingRuns: number;
  bowlingBalls: number;
  maidens: number;
  wides: number;
  noballs: number;
}

export interface MatchStat {
  id: number;
  runs: number;
  balls: number;
  wickets: number;
  fours: number;
  hitMap: { x: number, y: number }[];
  // Bowling stats
  bowlingRuns: number;
  bowlingWickets: number;
  bowlingBalls: number;
  maidens: number;
  wides: number;
  noballs: number;
}

export interface BallEvent {
  over: number;
  ball: number;
  strikerId: number;
  bowlerId: number;
  type: 'run' | 'wicket' | 'wide' | 'noball';
  value: number; // runs scored on this ball
  isExtra: boolean;
  coord?: { x: number, y: number };
}

export interface Match {
  id?: number;
  date: string;
  team_a: number[]; // player IDs
  team_b: number[]; // player IDs
  score_a: number;
  score_b: number;
  wickets_a: number;
  wickets_b: number;
  overs_a: string;
  overs_b: string;
  winner: string;
  player_stats: MatchStat[];
  ball_by_ball: BallEvent[];
}

const DB_NAME = 'BoxCricketDB';
const DB_VERSION = 1;

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('players')) {
        db.createObjectStore('players', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('matches')) {
        db.createObjectStore('matches', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export const dbService = {
  async getPlayers() {
    const db = await initDB();
    return db.getAll('players') as Promise<Player[]>;
  },
  async addPlayer(player: Omit<Player, 'id'>) {
    const db = await initDB();
    return db.add('players', player);
  },
  async updatePlayer(player: Player) {
    const db = await initDB();
    return db.put('players', player);
  },
  async deletePlayer(id: number) {
    const db = await initDB();
    return db.delete('players', id);
  },
  async getMatches() {
    const db = await initDB();
    return db.getAll('matches') as Promise<Match[]>;
  },
  async addMatch(match: Match) {
    const db = await initDB();
    return db.add('matches', match);
  },
  async deleteMatch(id: number) {
    const db = await initDB();
    return db.delete('matches', id);
  },
  async exportData() {
    const db = await initDB();
    const players = await db.getAll('players');
    const matches = await db.getAll('matches');
    
    // Convert Blobs to Base64 for JSON export
    const playersWithBase64 = await Promise.all(players.map(async p => {
      if (p.photo instanceof Blob) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(p.photo as Blob);
        });
        return { ...p, photo: base64 };
      }
      return p;
    }));

    return JSON.stringify({ players: playersWithBase64, matches });
  },
  async importData(jsonString: string) {
    const db = await initDB();
    const { players, matches } = JSON.parse(jsonString);
    
    const tx = db.transaction(['players', 'matches'], 'readwrite');
    await tx.objectStore('players').clear();
    await tx.objectStore('matches').clear();
    
    for (const p of players) {
      if (typeof p.photo === 'string' && p.photo.startsWith('data:')) {
        const res = await fetch(p.photo);
        p.photo = await res.blob();
      }
      await tx.objectStore('players').add(p);
    }
    for (const m of matches) {
      await tx.objectStore('matches').add(m);
    }
    await tx.done;
  }
};
