const MIN_LOBBY_PLAYERS = 2;

export function parseLobbySeed(search) {
  const params = new URLSearchParams(typeof search === 'string' ? search : '');
  const playersRaw = params.get('players');
  const namesRaw = params.get('names');

  let playerCount = null;
  if (typeof playersRaw === 'string' && playersRaw.trim() !== '') {
    const parsed = Number.parseInt(playersRaw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      playerCount = parsed;
    }
  }

  const playerNames = typeof namesRaw === 'string'
    ? namesRaw
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
    : [];

  if (playerCount === null && playerNames.length === 0) {
    return null;
  }

  return {
    playerCount: Math.max(MIN_LOBBY_PLAYERS, playerCount || 0, playerNames.length),
    playerNames
  };
}
