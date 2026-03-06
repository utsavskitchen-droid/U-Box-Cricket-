import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Trophy, 
  Play, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  Target,
  BarChart3,
  Settings,
  History,
  Search,
  ArrowUpDown,
  Download,
  Upload,
  X,
  RotateCcw,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService, Player, Match, MatchStat, BallEvent } from './db';

type View = 'dashboard' | 'players' | 'setup' | 'scoring' | 'stats' | 'history' | 'profile' | 'match-detail';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [players, setPlayers] = useState<Player[]>([]);
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [matchConfig, setMatchConfig] = useState({ overs: 5 });
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    // Cleanup photo URLs
    return () => {
      Object.values(photoUrls).forEach(URL.revokeObjectURL);
    };
  }, [photoUrls]);

  const loadPlayers = async () => {
    const data = await dbService.getPlayers();
    setPlayers(data);
    
    // Create URLs for Blobs
    const urls: Record<number, string> = {};
    data.forEach(p => {
      if (p.photo instanceof Blob) {
        urls[p.id] = URL.createObjectURL(p.photo);
      }
    });
    setPhotoUrls(urls);
  };

  const addPlayer = async (name: string, photo?: Blob) => {
    await dbService.addPlayer({
      name,
      photo,
      runs: 0,
      balls: 0,
      matches: 0,
      wickets: 0,
      hit_map: [],
      bowlingRuns: 0,
      bowlingBalls: 0,
      maidens: 0,
      wides: 0,
      noballs: 0
    });
    loadPlayers();
  };

  const deletePlayer = async (id: number) => {
    await dbService.deletePlayer(id);
    loadPlayers();
  };

  const deleteMatch = async (id: number) => {
    await dbService.deleteMatch(id);
    
    const allPlayers = await dbService.getPlayers();
    const allMatches = await dbService.getMatches();
    
    const updatedPlayers = allPlayers.map(p => ({
      ...p,
      runs: 0,
      balls: 0,
      matches: 0,
      wickets: 0,
      hit_map: [],
      bowlingRuns: 0,
      bowlingBalls: 0,
      maidens: 0,
      wides: 0,
      noballs: 0
    }));
    
    for (const match of allMatches) {
      for (const stat of match.player_stats) {
        const player = updatedPlayers.find(p => p.id === stat.id);
        if (player) {
          player.runs += stat.runs;
          player.balls += stat.balls;
          player.matches += 1;
          player.wickets += stat.wickets;
          player.hit_map = [...player.hit_map, ...stat.hitMap];
          player.bowlingRuns += stat.bowlingRuns || 0;
          player.bowlingBalls += stat.bowlingBalls || 0;
          player.maidens += stat.maidens || 0;
          player.wides += stat.wides || 0;
          player.noballs += stat.noballs || 0;
        }
      }
    }
    
    for (const p of updatedPlayers) {
      await dbService.updatePlayer(p);
    }
    
    loadPlayers();
  };

  const exportData = async () => {
    const json = await dbService.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `box_cricket_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const json = event.target?.result as string;
      await dbService.importData(json);
      loadPlayers();
      alert('Data restored successfully!');
    };
    reader.readAsText(file);
  };

  const openProfile = (id: number) => {
    setSelectedPlayerId(id);
    setView('profile');
  };

  const openMatchDetail = (match: Match) => {
    setSelectedMatch(match);
    setView('match-detail');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-[#ccff00] selection:text-black">
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#141414] border-t border-white/10 px-4 py-4 flex justify-around items-center z-50">
        <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Trophy size={20} />} label="Home" />
        <NavButton active={view === 'players'} onClick={() => setView('players')} icon={<Users size={20} />} label="Players" />
        <NavButton active={view === 'history' || view === 'match-detail'} onClick={() => setView('history')} icon={<History size={20} />} label="History" />
        <button 
          onClick={() => setView('setup')}
          className="bg-[#ccff00] text-black p-4 rounded-full -mt-12 shadow-lg shadow-[#ccff00]/20 active:scale-95 transition-transform"
        >
          <Play size={24} fill="currentColor" />
        </button>
        <div className="flex flex-col items-center gap-1 text-white/40">
          <label className="cursor-pointer flex flex-col items-center gap-1">
            <Upload size={20} />
            <span className="text-[10px] uppercase font-bold tracking-wider">Restore</span>
            <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
        </div>
        <button onClick={exportData} className="flex flex-col items-center gap-1 text-white/40">
          <Download size={20} />
          <span className="text-[10px] uppercase font-bold tracking-wider">Backup</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="pb-32 pt-8 px-4 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && <Dashboard key="dashboard" setView={setView} players={players} photoUrls={photoUrls} />}
          {view === 'players' && <PlayerManager key="players" players={players} photoUrls={photoUrls} onAdd={addPlayer} onDelete={deletePlayer} onPlayerClick={openProfile} />}
          {view === 'setup' && <MatchSetup key="setup" players={players} photoUrls={photoUrls} onStart={(a, b, o) => {
            setTeamA(a);
            setTeamB(b);
            setMatchConfig({ overs: o });
            setView('scoring');
          }} />}
          {view === 'scoring' && <ScoringBoard key="scoring" teamA={teamA} teamB={teamB} config={matchConfig} onFinish={() => { setView('history'); loadPlayers(); }} />}
          {view === 'history' && <MatchHistory key="history" onMatchClick={openMatchDetail} onDeleteMatch={deleteMatch} />}
          {view === 'match-detail' && selectedMatch && <MatchDetail key="match-detail" match={selectedMatch} players={players} photoUrls={photoUrls} onBack={() => setView('history')} />}
          {view === 'profile' && selectedPlayerId && (
            <PlayerProfile 
              key="profile" 
              playerId={selectedPlayerId} 
              players={players} 
              photoUrls={photoUrls}
              onBack={() => setView('players')} 
            />
          )}
        </AnimatePresence>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --neon-green: #ccff00;
        }
        .bg-neon-green { background-color: var(--neon-green); }
        .text-neon-green { color: var(--neon-green); }
        .border-neon-green { border-color: var(--neon-green); }
      `}} />
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-[#ccff00]' : 'text-white/40'}`}>
      {icon}
      <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
    </button>
  );
}

// --- Components ---

function Dashboard({ setView, players, photoUrls }: { key?: string, setView: (v: View) => void, players: Player[], photoUrls: Record<number, string> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <header className="mb-8">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
          Box Cricket<br /><span className="text-[#ccff00]">Pro Scorer</span>
        </h1>
        <p className="text-white/40 text-sm mt-2 font-medium uppercase tracking-widest">IndexedDB Storage • Pro Analytics</p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#141414] p-6 rounded-2xl border border-white/5">
          <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Total Players</p>
          <p className="text-3xl font-black italic">{players.length}</p>
        </div>
        <div className="bg-[#141414] p-6 rounded-2xl border border-white/5">
          <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Matches Played</p>
          <p className="text-3xl font-black italic">{players.reduce((acc, p) => acc + p.matches, 0) / 2 | 0}</p>
        </div>
      </div>

      <button 
        onClick={() => setView('setup')}
        className="w-full bg-[#ccff00] text-black py-6 rounded-2xl font-black italic uppercase text-xl shadow-xl shadow-[#ccff00]/10 flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
      >
        Start New Match <Play size={24} fill="currentColor" />
      </button>

      <div className="mt-12">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-4">Recent Players</h2>
        <div className="flex -space-x-3">
          {players.slice(0, 5).map(p => (
            <div key={p.id} className="w-12 h-12 rounded-full border-2 border-[#0a0a0a] bg-[#1a1a1a] overflow-hidden">
              {photoUrls[p.id] ? <img src={photoUrls[p.id]} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20 font-bold">{p.name[0]}</div>}
            </div>
          ))}
          {players.length > 5 && (
            <div className="w-12 h-12 rounded-full border-2 border-[#0a0a0a] bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-white/40">
              +{players.length - 5}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PlayerManager({ players, photoUrls, onAdd, onDelete, onPlayerClick }: { key?: string, players: Player[], photoUrls: Record<number, string>, onAdd: (n: string, p?: Blob) => void, onDelete: (id: number) => void, onPlayerClick: (id: number) => void }) {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string>('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-black italic uppercase mb-6">Player Database</h2>
      
      <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 mb-8">
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#ccff00] mb-4">Add New Player</h3>
        <div className="flex gap-4 mb-4">
          <div className="relative w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {preview ? <img src={preview} className="w-full h-full object-cover" /> : <Plus size={24} className="text-white/20" />}
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
          <input 
            type="text" 
            placeholder="PLAYER NAME" 
            value={name}
            onChange={e => setName(e.target.value.toUpperCase())}
            className="flex-1 bg-transparent border-b border-white/10 focus:border-[#ccff00] outline-none font-bold italic text-xl px-2"
          />
        </div>
        <button 
          onClick={() => { if(name) { onAdd(name, photo || undefined); setName(''); setPhoto(null); setPreview(''); } }}
          className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors"
        >
          Save Player
        </button>
      </div>

      <div className="space-y-3">
        {players.map(p => (
          <div key={p.id} className="bg-[#141414] p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <div 
              onClick={() => onPlayerClick(p.id)}
              className="w-12 h-12 rounded-xl bg-[#1a1a1a] overflow-hidden shrink-0 cursor-pointer"
            >
              {photoUrls[p.id] ? <img src={photoUrls[p.id]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/20 font-bold">{p.name[0]}</div>}
            </div>
            <div className="flex-1 cursor-pointer" onClick={() => onPlayerClick(p.id)}>
              <p className="font-black italic uppercase">{p.name}</p>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{p.matches} Matches • {p.runs} Runs</p>
            </div>
            <button onClick={() => onDelete(p.id)} className="text-white/20 hover:text-red-500 transition-colors p-2">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function MatchSetup({ players, photoUrls, onStart }: { key?: string, players: Player[], photoUrls: Record<number, string>, onStart: (a: Player[], b: Player[], o: number) => void }) {
  const [teamA, setTeamA] = useState<number[]>([]);
  const [teamB, setTeamB] = useState<number[]>([]);
  const [overs, setOvers] = useState(5);

  const togglePlayer = (id: number, team: 'A' | 'B') => {
    if (team === 'A') {
      setTeamA(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    } else {
      setTeamB(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-black italic uppercase mb-6">Match Setup</h2>

      <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 mb-6">
        <p className="text-[10px] uppercase font-bold tracking-widest text-[#ccff00] mb-4">Match Length</p>
        <div className="flex items-center justify-between">
          <button onClick={() => setOvers(Math.max(1, overs - 1))} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold">-</button>
          <div className="text-center">
            <span className="text-4xl font-black italic">{overs}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest block text-white/40">Overs</span>
          </div>
          <button onClick={() => setOvers(overs + 1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold">+</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <TeamSelector label="Team A" selected={teamA} players={players} photoUrls={photoUrls} onToggle={id => togglePlayer(id, 'A')} color="border-blue-500" />
        <TeamSelector label="Team B" selected={teamB} players={players} photoUrls={photoUrls} onToggle={id => togglePlayer(id, 'B')} color="border-red-500" />
      </div>

      <button 
        disabled={teamA.length === 0 || teamB.length === 0}
        onClick={() => onStart(
          players.filter(p => teamA.includes(p.id)),
          players.filter(p => teamB.includes(p.id)),
          overs
        )}
        className="w-full bg-[#ccff00] disabled:bg-white/10 disabled:text-white/20 text-black py-5 rounded-2xl font-black italic uppercase text-xl shadow-xl active:scale-95 transition-all"
      >
        Play Ball
      </button>
    </motion.div>
  );
}

function TeamSelector({ label, selected, players, photoUrls, onToggle, color }: { label: string, selected: number[], players: Player[], photoUrls: Record<number, string>, onToggle: (id: number) => void, color: string }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 text-center">{label} ({selected.length})</p>
      <div className="bg-[#141414] rounded-2xl border border-white/5 p-2 max-h-[400px] overflow-y-auto">
        {players.map(p => (
          <button 
            key={p.id} 
            onClick={() => onToggle(p.id)}
            className={`w-full p-2 mb-1 rounded-xl flex items-center gap-2 transition-all ${selected.includes(p.id) ? `bg-white/10 border-l-4 ${color}` : 'bg-transparent border-l-4 border-transparent'}`}
          >
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] overflow-hidden shrink-0">
              {photoUrls[p.id] ? <img src={photoUrls[p.id]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">{p.name[0]}</div>}
            </div>
            <span className="text-[10px] font-bold uppercase truncate">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoringBoard({ teamA, teamB, config, onFinish }: { key?: string, teamA: Player[], teamB: Player[], config: { overs: number }, onFinish: () => void }) {
  const [innings, setInnings] = useState(1);
  const [score, setScore] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [firstInningsWickets, setFirstInningsWickets] = useState(0);
  const [firstInningsScore, setFirstInningsScore] = useState(0);
  const [firstInningsOvers, setFirstInningsOvers] = useState('0.0');
  const [balls, setBalls] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  
  const [strikerId, setStrikerId] = useState<number | null>(null);
  const [bowlerId, setBowlerId] = useState<number | null>(null);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showNoBallModal, setShowNoBallModal] = useState(false);
  const [outPlayers, setOutPlayers] = useState<number[]>([]);

  const [playerStats, setPlayerStats] = useState<Record<number, MatchStat>>({});
  const [ballHistory, setBallHistory] = useState<BallEvent[]>([]);
  const [showHitMap, setShowHitMap] = useState(false);

  const battingTeam = innings === 1 ? teamA : teamB;
  const bowlingTeam = innings === 1 ? teamB : teamA;

  const striker = battingTeam.find(p => p.id === strikerId) || battingTeam[0];
  const bowler = bowlingTeam.find(p => p.id === bowlerId) || bowlingTeam[0];

  const handleAction = (type: 'run' | 'wicket' | 'wide' | 'noball', value: number = 0) => {
    if (strikerId === null || bowlerId === null) return;
    
    if (type === 'noball' && value === 0 && !showNoBallModal) {
      setShowNoBallModal(true);
      return;
    }

    const event: BallEvent = {
      over: Math.floor(balls / 6),
      ball: (balls % 6) + 1,
      strikerId: strikerId,
      bowlerId: bowlerId,
      type,
      value,
      isExtra: type === 'wide' || type === 'noball'
    };

    const newHistory = [...ballHistory, event];
    setBallHistory(newHistory);
    applyEvent(event);
    
    if (type === 'noball') setShowNoBallModal(false);
  };

  const applyEvent = (event: BallEvent, isReplay: boolean = false) => {
    if (event.type === 'run') {
      setScore(s => s + event.value);
      setBalls(b => b + 1);
      updateStat(event.strikerId, event.value, 1, 0, event.value === 4 ? 1 : 0, undefined, event.bowlerId, event.value, 0, 1, 0, 0, 0);
      if (!isReplay && event.value === 4) setShowHitMap(true);
    } else if (event.type === 'wide' || event.type === 'noball') {
      const runValue = event.type === 'noball' ? event.value : 0;
      setScore(s => s + 1 + runValue);
      updateStat(
        event.strikerId, 
        runValue, 
        0, 
        0, 
        runValue === 4 ? 1 : 0, 
        undefined, 
        event.bowlerId, 
        1 + runValue, 
        0, 
        0, 
        0, 
        event.type === 'wide' ? 1 : 0, 
        event.type === 'noball' ? 1 : 0
      );
      if (!isReplay && runValue === 4) setShowHitMap(true);
    } else if (event.type === 'wicket') {
      setWickets(w => w + 1);
      setBalls(b => b + 1);
      updateStat(event.strikerId, 0, 1, 0, 0, undefined, event.bowlerId, 0, 1, 1, 0, 0, 0);
      setOutPlayers(prev => [...prev, event.strikerId]);
      
      if (!isReplay) {
        if (wickets + 1 < battingTeam.length) {
          setStrikerId(null);
          setShowWicketModal(true);
        } else {
          finishInnings();
        }
      }
    }

    if (!isReplay && event.type !== 'wide' && event.type !== 'noball' && (balls + 1) % 6 === 0) {
      // Check for maiden over
      const currentOverBalls = [...ballHistory, event].filter(e => e.over === event.over);
      const runsInOver = currentOverBalls.reduce((acc, e) => acc + e.value + (e.isExtra ? 1 : 0), 0);
      if (runsInOver === 0) {
        updateStat(0, 0, 0, 0, 0, undefined, event.bowlerId, 0, 0, 0, 1, 0, 0);
      }

      if (balls + 1 < config.overs * 6) {
        setBowlerId(null);
        setShowBowlerModal(true);
      } else {
        finishInnings();
      }
    }
  };

  const undoLastBall = () => {
    if (ballHistory.length === 0) return;
    const newHistory = ballHistory.slice(0, -1);
    setBallHistory(newHistory);
    
    // Reset states
    setScore(0);
    setWickets(0);
    setBalls(0);
    setStrikerId(null);
    setBowlerId(null);
    setOutPlayers([]);
    setPlayerStats({});
    
    // Replay history to restore state
    // We use local variables to avoid async state issues during replay
    let s = 0, w = 0, b = 0, sId: number | null = null, bId: number | null = null;
    let out: number[] = [];
    let stats: Record<number, MatchStat> = {};

    newHistory.forEach(event => {
      const pId = event.strikerId;
      const bwId = event.bowlerId;
      if (!stats[pId]) stats[pId] = { id: pId, runs: 0, balls: 0, wickets: 0, fours: 0, hitMap: [], bowlingRuns: 0, bowlingWickets: 0, bowlingBalls: 0, maidens: 0, wides: 0, noballs: 0 };
      if (!stats[bwId]) stats[bwId] = { id: bwId, runs: 0, balls: 0, wickets: 0, fours: 0, hitMap: [], bowlingRuns: 0, bowlingWickets: 0, bowlingBalls: 0, maidens: 0, wides: 0, noballs: 0 };

      sId = pId;
      bId = bwId;
      if (event.type === 'run') {
        s += event.value;
        b += 1;
        stats[pId].runs += event.value;
        stats[pId].balls += 1;
        stats[bwId].bowlingRuns += event.value;
        stats[bwId].bowlingBalls += 1;
        if (event.value === 4) {
          stats[pId].fours += 1;
          if (event.coord) stats[pId].hitMap.push(event.coord);
        }
      } else if (event.type === 'wide' || event.type === 'noball') {
        s += 1;
        stats[bwId].bowlingRuns += 1;
        if (event.type === 'wide') stats[bwId].wides += 1;
        if (event.type === 'noball') stats[bwId].noballs += 1;
      } else if (event.type === 'wicket') {
        w += 1;
        b += 1;
        stats[pId].balls += 1;
        stats[bwId].bowlingWickets += 1;
        stats[bwId].bowlingBalls += 1;
        out.push(pId);
        sId = null; // Striker is out
      }
      
      if (event.type !== 'wide' && event.type !== 'noball' && b % 6 === 0 && b > 0) {
        // Check for maiden
        const overBalls = newHistory.filter(e => e.over === event.over);
        const runsInOver = overBalls.reduce((acc, e) => acc + e.value + (e.isExtra ? 1 : 0), 0);
        if (runsInOver === 0) stats[bwId].maidens += 1;
        
        bId = null; // Over finished
      }
    });

    setScore(s);
    setWickets(w);
    setBalls(b);
    setBowlerId(bId);
    setStrikerId(sId);
    setOutPlayers(out);
    setPlayerStats(stats);
  };

  const updateStat = (
    id: number, runs: number, balls: number, wickets: number, fours: number, hitCoord?: { x: number, y: number },
    bId?: number, bRuns: number = 0, bWickets: number = 0, bBalls: number = 0, bMaidens: number = 0, bWides: number = 0, bNoballs: number = 0
  ) => {
    setPlayerStats(prev => {
      let next = { ...prev };
      
      // Update Batting
      const current = next[id] || { id, runs: 0, balls: 0, wickets: 0, fours: 0, hitMap: [], bowlingRuns: 0, bowlingWickets: 0, bowlingBalls: 0, maidens: 0, wides: 0, noballs: 0 };
      const newHitMap = [...current.hitMap];
      if (hitCoord) newHitMap.push(hitCoord);
      next[id] = {
        ...current,
        runs: current.runs + runs,
        balls: current.balls + balls,
        wickets: current.wickets + wickets,
        fours: current.fours + fours,
        hitMap: newHitMap
      };

      // Update Bowling
      if (bId !== undefined) {
        const bCurrent = next[bId] || { id: bId, runs: 0, balls: 0, wickets: 0, fours: 0, hitMap: [], bowlingRuns: 0, bowlingWickets: 0, bowlingBalls: 0, maidens: 0, wides: 0, noballs: 0 };
        next[bId] = {
          ...bCurrent,
          bowlingRuns: bCurrent.bowlingRuns + bRuns,
          bowlingWickets: bCurrent.bowlingWickets + bWickets,
          bowlingBalls: bCurrent.bowlingBalls + bBalls,
          maidens: bCurrent.maidens + bMaidens,
          wides: bCurrent.wides + bWides,
          noballs: bCurrent.noballs + bNoballs
        };
      }

      return next;
    });
  };

  const finishInnings = () => {
    if (innings === 1) {
      const currentOver = Math.floor(balls / 6);
      const currentBall = balls % 6;
      setFirstInningsOvers(`${currentOver}.${currentBall}`);
      setFirstInningsScore(score);
      setFirstInningsWickets(wickets);
      setTarget(score + 1);
      setInnings(2);
      setScore(0);
      setWickets(0);
      setBalls(0);
      setStrikerId(null);
      setBowlerId(null);
      setOutPlayers([]);
      setBallHistory([]);
    } else {
      finalizeMatch();
    }
  };

  const finalizeMatch = async () => {
    const winner = target ? (score >= target ? 'Team B' : 'Team A') : 'N/A';
    const currentOver = Math.floor(balls / 6);
    const currentBall = balls % 6;
    const oversStr = `${currentOver}.${currentBall}`;

    const match: Match = {
      date: new Date().toISOString(),
      team_a: teamA.map(p => p.id),
      team_b: teamB.map(p => p.id),
      score_a: firstInningsScore,
      score_b: score,
      wickets_a: firstInningsWickets,
      wickets_b: wickets,
      overs_a: firstInningsOvers,
      overs_b: oversStr,
      winner,
      player_stats: Object.values(playerStats),
      ball_by_ball: ballHistory
    };

    await dbService.addMatch(match);
    
    // Update lifetime stats for players
    const allPlayers = await dbService.getPlayers();
    for (const stat of Object.values(playerStats) as MatchStat[]) {
      const player = allPlayers.find(p => p.id === stat.id);
      if (player) {
        player.runs += stat.runs;
        player.balls += stat.balls;
        player.matches += 1;
        player.wickets += stat.wickets;
        player.hit_map = [...player.hit_map, ...stat.hitMap];
        // New bowling stats
        player.bowlingRuns += stat.bowlingRuns || 0;
        player.bowlingBalls += stat.bowlingBalls || 0;
        player.maidens += stat.maidens || 0;
        player.wides += stat.wides || 0;
        player.noballs += stat.noballs || 0;
        await dbService.updatePlayer(player);
      }
    }

    onFinish();
  };

  const currentOver = Math.floor(balls / 6);
  const currentBall = balls % 6;

  return (
    <div className="space-y-6">
      <div className="bg-[#141414] p-8 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Target size={120} />
        </div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#ccff00]">Innings {innings}</p>
            <h3 className="text-xl font-black italic uppercase">{innings === 1 ? 'Team A' : 'Team B'} Batting</h3>
          </div>
          {target && (
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-white/40">Target</p>
              <p className="text-xl font-black italic">{target}</p>
            </div>
          )}
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="text-7xl font-black italic tracking-tighter">{score}</span>
          <span className="text-3xl font-black italic text-white/20">/ {wickets}</span>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <p className="text-xl font-bold italic text-white/40">Over {currentOver}.{currentBall}</p>
          <div className="flex gap-1">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < currentBall ? 'bg-[#ccff00]' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strikerId === null ? (
          <div className="bg-[#141414] p-6 rounded-2xl border border-[#ccff00] border-dashed flex flex-col items-center gap-4">
            <p className="text-sm font-black italic uppercase text-white/60">Select {wickets === 0 ? 'Opening' : 'Next'} Batsman</p>
            <div className="flex flex-wrap justify-center gap-2">
              {battingTeam.filter(p => !outPlayers.includes(p.id)).map(p => (
                <button
                  key={p.id}
                  onClick={() => setStrikerId(p.id)}
                  className="px-4 py-2 bg-white/5 hover:bg-[#ccff00] hover:text-black rounded-xl text-[10px] font-bold uppercase transition-all"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#141414] p-4 rounded-2xl border border-[#ccff00]/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] overflow-hidden">
              {striker.photo instanceof Blob ? <img src={URL.createObjectURL(striker.photo)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{striker.name[0]}</div>}
            </div>
            <div className="flex-1">
              <p className="text-[8px] uppercase font-bold tracking-widest text-white/40 mb-1">Striker</p>
              <p className="text-sm font-black italic uppercase">{striker.name}</p>
              <p className="text-xs font-bold text-[#ccff00]">{playerStats[striker.id]?.runs || 0} ({playerStats[striker.id]?.balls || 0})</p>
            </div>
            <button onClick={undoLastBall} className="p-3 bg-white/5 rounded-xl text-white/40 active:text-white transition-colors">
              <RotateCcw size={20} />
            </button>
          </div>
        )}

        {bowlerId === null ? (
          <div className="bg-[#141414] p-6 rounded-2xl border border-blue-500 border-dashed flex flex-col items-center gap-4">
            <p className="text-sm font-black italic uppercase text-white/60">Select {balls === 0 ? 'Opening' : 'Next'} Bowler</p>
            <div className="flex flex-wrap justify-center gap-2">
              {bowlingTeam.map(p => (
                <button
                  key={p.id}
                  onClick={() => setBowlerId(p.id)}
                  className="px-4 py-2 bg-white/5 hover:bg-blue-500 hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[#141414] p-4 rounded-2xl border border-blue-500/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] overflow-hidden">
              {bowler.photo instanceof Blob ? <img src={URL.createObjectURL(bowler.photo)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold">{bowler.name[0]}</div>}
            </div>
            <div className="flex-1">
              <p className="text-[8px] uppercase font-bold tracking-widest text-white/40 mb-1">Bowler</p>
              <p className="text-sm font-black italic uppercase">{bowler.name}</p>
              <div className="flex gap-2">
                <p className="text-xs font-bold text-blue-400">
                  {Math.floor((playerStats[bowler.id]?.bowlingBalls || 0) / 6)}.{ (playerStats[bowler.id]?.bowlingBalls || 0) % 6 } - {playerStats[bowler.id]?.maidens || 0} - {playerStats[bowler.id]?.bowlingRuns || 0} - {playerStats[bowler.id]?.bowlingWickets || 0}
                </p>
                <p className="text-[8px] font-bold text-white/20 uppercase mt-0.5">WD: {playerStats[bowler.id]?.wides || 0} NB: {playerStats[bowler.id]?.noballs || 0}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3, 4, 6].map(r => (
          <ActionButton key={r} label={r.toString()} onClick={() => handleAction('run', r)} color={r >= 4 ? 'bg-[#ccff00] text-black' : 'bg-white/5'} />
        ))}
        <ActionButton label="WD" onClick={() => handleAction('wide')} color="bg-blue-500/20 text-blue-400" />
        <ActionButton label="NB" onClick={() => handleAction('noball')} color="bg-orange-500/20 text-orange-400" />
        <ActionButton label="W" onClick={() => handleAction('wicket')} color="bg-red-500/20 text-red-400" />
        <ActionButton label="UNDO" onClick={undoLastBall} color="bg-white/10 text-white/60" />
      </div>

      <button 
        onClick={finishInnings}
        className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-[0.2em] transition-colors"
      >
        {innings === 1 ? 'End Innings' : 'Finish Match'}
      </button>

      {showHitMap && (
        <HitMapModal 
          onSelect={(coord) => {
            updateStat(striker.id, 0, 0, 0, 0, coord);
            // Also update the last ball in history with the coordinate
            setBallHistory(prev => {
              const last = prev[prev.length - 1];
              if (last && last.type === 'run' && last.value === 4) {
                return [...prev.slice(0, -1), { ...last, coord }];
              }
              return prev;
            });
            setShowHitMap(false);
          }} 
        />
      )}

      {showWicketModal && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#141414] w-full max-w-sm rounded-3xl border border-white/10 p-6">
            <h3 className="text-xl font-black italic uppercase mb-6">Select Next Batsman</h3>
            <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-2">
              {battingTeam.map((p, idx) => {
                const isOut = outPlayers.includes(p.id);
                const isCurrent = striker.id === p.id;
                if (isOut || isCurrent) return null;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setStrikerId(p.id);
                      setShowWicketModal(false);
                    }}
                    className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    <span className="font-bold uppercase">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showNoBallModal && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#141414] w-full max-w-sm rounded-3xl border border-white/10 p-8">
            <h3 className="text-xl font-black italic uppercase text-center mb-8">Runs on No-Ball?</h3>
            <div className="grid grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4].map(r => (
                <button
                  key={r}
                  onClick={() => handleAction('noball', r)}
                  className="h-14 bg-white/5 hover:bg-[#ccff00] hover:text-black rounded-xl flex items-center justify-center text-xl font-black italic transition-all"
                >
                  {r}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowNoBallModal(false)}
              className="w-full mt-8 py-3 text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({ label, onClick, color }: { key?: any, label: string, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      className={`${color} h-16 rounded-2xl flex items-center justify-center text-xl font-black italic active:scale-90 transition-transform`}
    >
      {label}
    </button>
  );
}

function HitMapModal({ onSelect }: { onSelect: (coord: { x: number, y: number }) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onSelect({ x, y });
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm">
        <h3 className="text-2xl font-black italic uppercase text-center mb-8 text-[#ccff00]">Where was the 4 hit?</h3>
        <div 
          ref={containerRef}
          onClick={handleClick}
          className="aspect-[1/2] bg-[#1a1a1a] border-4 border-white/10 rounded-xl relative cursor-crosshair overflow-hidden"
        >
          <div className="absolute inset-0 border-2 border-white/5 pointer-events-none" />
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2" />
          <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/10 -translate-x-1/2" />
          <div className="absolute top-[15%] left-0 right-0 h-0.5 bg-white/5" />
          <div className="absolute bottom-[15%] left-0 right-0 h-0.5 bg-white/5" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[10px] font-bold uppercase text-white/5 tracking-[1em] rotate-90">TAP TO MARK</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerProfile({ playerId, players, photoUrls, onBack }: { key?: string, playerId: number, players: Player[], photoUrls: Record<number, string>, onBack: () => void }) {
  const [playerMatches, setPlayerMatches] = useState<Match[]>([]);
  const player = players.find(p => p.id === playerId);

  useEffect(() => {
    fetchPlayerMatches();
  }, [playerId]);

  const fetchPlayerMatches = async () => {
    const allMatches = await dbService.getMatches();
    const filtered = allMatches.filter(m => [...m.team_a, ...m.team_b].includes(playerId));
    setPlayerMatches(filtered);
  };

  if (!player) return null;

  const sr = player.balls > 0 ? ((player.runs / player.balls) * 100).toFixed(1) : '0.0';
  const avg = player.matches > 0 ? (player.runs / player.matches).toFixed(1) : '0.0';

  // Bowling stats
  const bowlOvers = `${Math.floor(player.bowlingBalls / 6)}.${player.bowlingBalls % 6}`;
  const economy = player.bowlingBalls > 0 ? ((player.bowlingRuns / (player.bowlingBalls / 6))).toFixed(2) : '0.00';
  const extraPct = player.bowlingBalls > 0 ? (((player.wides + player.noballs) / player.bowlingBalls) * 100).toFixed(1) : '0.0';

  // PvP Analytics
  const getPvPStats = () => {
    const dismissalsByBowler: Record<number, number> = {};
    const dismissalsOfBatsman: Record<number, number> = {};
    const runsAgainstBowler: Record<number, { runs: number, balls: number }> = {};

    playerMatches.forEach(m => {
      m.ball_by_ball.forEach(event => {
        // As Batsman
        if (event.strikerId === playerId) {
          if (!runsAgainstBowler[event.bowlerId]) runsAgainstBowler[event.bowlerId] = { runs: 0, balls: 0 };
          if (event.type === 'run') {
            runsAgainstBowler[event.bowlerId].runs += event.value;
            runsAgainstBowler[event.bowlerId].balls += 1;
          } else if (event.type === 'wicket') {
            runsAgainstBowler[event.bowlerId].balls += 1;
            dismissalsByBowler[event.bowlerId] = (dismissalsByBowler[event.bowlerId] || 0) + 1;
          }
        }
        // As Bowler
        if (event.bowlerId === playerId && event.type === 'wicket') {
          dismissalsOfBatsman[event.strikerId] = (dismissalsOfBatsman[event.strikerId] || 0) + 1;
        }
      });
    });

    const nemesisId = Object.entries(dismissalsByBowler).sort((a, b) => b[1] - a[1])[0]?.[0];
    const victimId = Object.entries(dismissalsOfBatsman).sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      nemesis: nemesisId ? players.find(p => p.id === Number(nemesisId)) : null,
      nemesisCount: nemesisId ? dismissalsByBowler[Number(nemesisId)] : 0,
      victim: victimId ? players.find(p => p.id === Number(victimId)) : null,
      victimCount: victimId ? dismissalsOfBatsman[Number(victimId)] : 0,
      matchups: Object.entries(runsAgainstBowler).map(([id, stats]) => ({
        bowler: players.find(p => p.id === Number(id)),
        ...stats
      })).sort((a, b) => b.runs - a.runs).slice(0, 3)
    };
  };

  const pvp = getPvPStats();

  // Zone Analysis
  const getZoneStats = () => {
    const zones = {
      'Front-Left': 0,
      'Front-Right': 0,
      'Back-Left': 0,
      'Back-Right': 0
    };
    
    player.hit_map.forEach(dot => {
      if (dot.y < 50) {
        if (dot.x < 50) zones['Front-Left']++;
        else zones['Front-Right']++;
      } else {
        if (dot.x < 50) zones['Back-Left']++;
        else zones['Back-Right']++;
      }
    });

    const total = player.hit_map.length || 1;
    return Object.entries(zones).map(([name, count]) => ({
      name,
      count,
      pct: ((count / total) * 100).toFixed(0)
    }));
  };

  const zoneStats = getZoneStats();

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors uppercase font-bold text-[10px] tracking-widest">
        <ChevronLeft size={16} /> Back to Players
      </button>

      <div className="bg-[#141414] p-8 rounded-3xl border border-white/5">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-2xl bg-[#1a1a1a] overflow-hidden shrink-0 border-2 border-white/5">
            {photoUrls[player.id] ? <img src={photoUrls[player.id]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-4xl">{player.name[0]}</div>}
          </div>
          <div>
            <h2 className="text-3xl font-black italic uppercase leading-none mb-2">{player.name}</h2>
            <p className="text-xs uppercase font-bold tracking-widest text-white/40">{player.matches} Matches Played</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#ccff00] mb-3">Batting Stats</h4>
            <div className="grid grid-cols-4 gap-4">
              <StatItem label="Runs" value={player.runs.toString()} />
              <StatItem label="Avg" value={avg} />
              <StatItem label="SR" value={sr} />
              <StatItem label="Fours" value={playerMatches.reduce((acc, m) => acc + (m.player_stats.find(s => s.id === playerId)?.fours || 0), 0).toString()} />
            </div>
          </div>

          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-blue-400 mb-3">Bowling Stats</h4>
            <div className="grid grid-cols-4 gap-4">
              <StatItem label="Wkts" value={player.wickets.toString()} />
              <StatItem label="Overs" value={bowlOvers} />
              <StatItem label="Maid" value={(player.maidens || 0).toString()} />
              <StatItem label="Econ" value={economy} />
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="text-[8px] uppercase font-bold tracking-widest text-white/40 mb-1">Nemesis</p>
            {pvp.nemesis ? (
              <div>
                <p className="text-sm font-black italic uppercase">{pvp.nemesis.name}</p>
                <p className="text-[10px] font-bold text-red-400">Out {pvp.nemesisCount} times</p>
              </div>
            ) : <p className="text-xs font-bold text-white/20">None yet</p>}
          </div>
          <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
            <p className="text-[8px] uppercase font-bold tracking-widest text-white/40 mb-1">Favorite Victim</p>
            {pvp.victim ? (
              <div>
                <p className="text-sm font-black italic uppercase">{pvp.victim.name}</p>
                <p className="text-[10px] font-bold text-[#ccff00]">Out {pvp.victimCount} times</p>
              </div>
            ) : <p className="text-xs font-bold text-white/20">None yet</p>}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#ccff00]">Head-to-Head Strike Rates</h4>
          <div className="space-y-2">
            {pvp.matchups.map(m => (
              <div key={m.bowler?.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                <span className="text-xs font-bold uppercase">{m.bowler?.name}</span>
                <span className="text-xs font-black italic text-[#ccff00]">{((m.runs / m.balls) * 100).toFixed(1)} SR</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#ccff00]">Career Hit Map & Zone Analysis</h4>
          <div className="aspect-[1/2] bg-[#1a1a1a] border-2 border-white/10 rounded-xl relative overflow-hidden">
            {/* Heatmap Overlays */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {zoneStats.map(z => (
                <div 
                  key={z.name} 
                  className="flex flex-col items-center justify-center border border-white/5 transition-colors"
                  style={{ backgroundColor: `rgba(204, 255, 0, ${Math.min(0.3, Number(z.pct) / 100)})` }}
                >
                  <span className="text-[10px] font-black italic text-[#ccff00]">{z.pct}%</span>
                  <span className="text-[6px] uppercase font-bold text-white/40 tracking-tighter">{z.name}</span>
                </div>
              ))}
            </div>

            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/10 -translate-x-1/2 pointer-events-none" />
            
            {player.hit_map.map((dot, i) => (
              <div 
                key={i}
                className="absolute w-1.5 h-1.5 bg-[#ccff00] rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(204,255,0,0.5)] z-10"
                style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-black italic uppercase">Match History</h3>
        <div className="space-y-3">
          {playerMatches.map(m => {
            const stats = m.player_stats.find(s => s.id === playerId);
            if (!stats) return null;
            return (
              <div key={m.id} className="bg-[#141414] p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1">{new Date(m.date).toLocaleDateString()}</p>
                  <p className="text-xs font-bold uppercase">Match #{m.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black italic">{stats.runs} <span className="text-[10px] text-white/20">({stats.balls})</span></p>
                  {(stats.bowlingBalls || 0) > 0 && (
                    <p className="text-[10px] font-bold text-blue-400">
                      {Math.floor(stats.bowlingBalls / 6)}.{stats.bowlingBalls % 6} - {stats.bowlingRuns} - {stats.bowlingWickets}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <p className="text-[8px] uppercase font-bold tracking-widest text-white/40 mb-1">{label}</p>
      <p className="text-xl font-black italic tracking-tight">{value}</p>
    </div>
  );
}

function MatchHistory({ onMatchClick, onDeleteMatch }: { key?: string, onMatchClick: (m: Match) => void, onDeleteMatch: (id: number) => void }) {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    dbService.getMatches().then(setMatches);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this match?")) {
      await onDeleteMatch(id);
      const updated = await dbService.getMatches();
      setMatches(updated);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h2 className="text-2xl font-black italic uppercase mb-6">Match Archive</h2>
      <div className="space-y-4">
        {matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
          <div 
            key={m.id} 
            onClick={() => onMatchClick(m)}
            className="bg-[#141414] p-6 rounded-3xl border border-white/5 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform group"
          >
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-2">{new Date(m.date).toLocaleDateString()}</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black italic">{m.score_a}/{m.wickets_a}</p>
                  <p className="text-[8px] font-bold uppercase text-white/20">Team A</p>
                </div>
                <div className="text-white/10 font-black italic text-xl">VS</div>
                <div className="text-center">
                  <p className="text-2xl font-black italic">{m.score_b}/{m.wickets_b}</p>
                  <p className="text-[8px] font-bold uppercase text-white/20">Team B</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-md mb-2 ${m.winner === 'Team A' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                  {m.winner} Won
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <button 
                    onClick={(e) => handleDelete(e, m.id!)}
                    className="p-2 text-white/10 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={20} className="text-white/20" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function MatchDetail({ match, players, photoUrls, onBack }: { key?: string, match: Match, players: Player[], photoUrls: Record<number, string>, onBack: () => void }) {
  const teamAPlayers = players.filter(p => match.team_a.includes(p.id));
  const teamBPlayers = players.filter(p => match.team_b.includes(p.id));

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors uppercase font-bold text-[10px] tracking-widest">
        <ChevronLeft size={16} /> Back to History
      </button>

      <div className="bg-[#141414] p-8 rounded-3xl border border-white/5">
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-2">{new Date(match.date).toLocaleString()}</p>
          <h2 className={`text-3xl font-black italic uppercase ${match.winner === 'Team A' ? 'text-blue-400' : 'text-red-400'}`}>{match.winner} WON</h2>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="text-center">
            <p className="text-4xl font-black italic">{match.score_a}/{match.wickets_a}</p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/40">Team A ({match.overs_a} Ov)</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black italic">{match.score_b}/{match.wickets_b}</p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-white/40">Team B ({match.overs_b} Ov)</p>
          </div>
        </div>

        <div className="space-y-6">
          <ScorecardTable title="Team A Scorecard" players={teamAPlayers} stats={match.player_stats} photoUrls={photoUrls} />
          <ScorecardTable title="Team B Scorecard" players={teamBPlayers} stats={match.player_stats} photoUrls={photoUrls} />
        </div>
      </div>

      <div className="bg-[#141414] p-6 rounded-3xl border border-white/5">
        <h3 className="text-xl font-black italic uppercase mb-6">Ball-by-Ball Summary</h3>
        <div className="space-y-2">
          {match.ball_by_ball.map((ball, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
              <div className="w-12 text-[10px] font-bold text-white/20 uppercase">{ball.over}.{ball.ball}</div>
              <div className="flex-1">
                <span className="text-xs font-bold uppercase">{players.find(p => p.id === ball.strikerId)?.name}</span>
                <span className="text-[8px] text-white/20 ml-2 uppercase">vs {players.find(p => p.id === ball.bowlerId)?.name}</span>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black italic ${
                ball.type === 'wicket' ? 'bg-red-500 text-white' : 
                ball.value === 4 ? 'bg-[#ccff00] text-black' : 
                ball.isExtra ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5'
              }`}>
                {ball.type === 'wicket' ? 'W' : ball.isExtra ? ball.type[0].toUpperCase() : ball.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ScorecardTable({ title, players, stats, photoUrls }: { title: string, players: Player[], stats: MatchStat[], photoUrls: Record<number, string> }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-[#ccff00] mb-3">{title} - Batting</h4>
        <div className="space-y-2">
          {players.map(p => {
            const s = stats.find(stat => stat.id === p.id);
            if (!s || s.balls === 0) return null;
            return (
              <div key={p.id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#1a1a1a] overflow-hidden">
                    {photoUrls[p.id] ? <img src={photoUrls[p.id]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px]">{p.name[0]}</div>}
                  </div>
                  <span className="font-bold uppercase">{p.name}</span>
                </div>
                <div className="flex gap-4 font-mono">
                  <span>{s.runs} <span className="text-white/20">({s.balls})</span></span>
                  <span className="text-white/40">{((s.runs / s.balls) * 100).toFixed(1)} SR</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-blue-400 mb-3">{title} - Bowling</h4>
        <div className="space-y-2">
          {players.map(p => {
            const s = stats.find(stat => stat.id === p.id);
            if (!s || s.bowlingBalls === 0) return null;
            return (
              <div key={p.id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase">{p.name}</span>
                </div>
                <div className="flex gap-4 font-mono">
                  <span>{Math.floor(s.bowlingBalls / 6)}.{s.bowlingBalls % 6}</span>
                  <span>{s.bowlingRuns}</span>
                  <span className="text-[#ccff00]">{s.bowlingWickets}W</span>
                  <span className="text-white/40">{(s.bowlingRuns / (s.bowlingBalls / 6)).toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
