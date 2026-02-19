import {
	ref,
	set,
	get,
	update,
	remove,
	onValue,
	onDisconnect,
	serverTimestamp,
	type DatabaseReference,
	type Unsubscribe
} from 'firebase/database';
import { getFirebaseDatabase, ensureAuth } from './firebase';
import { generateLobbyCode, validatePlayerName, getNewHost } from './lobby';
import { initializeGame } from './gameService';
import type { Lobby, Player, Seat, PlayerSeat, SessionData } from './types';

const SESSION_STORAGE_KEY = 'klaverjas_session';

export interface CreateLobbyResult {
	success: boolean;
	lobbyCode?: string;
	playerId?: string;
	error?: string;
}

export interface JoinLobbyResult {
	success: boolean;
	playerId?: string;
	error?: string;
}

export interface LobbyError {
	code: 'not_found' | 'name_taken' | 'lobby_full' | 'invalid_name' | 'firebase_error';
	message: string;
}

function getLobbyRef(code: string): DatabaseReference {
	const db = getFirebaseDatabase();
	return ref(db, `lobbies/${code}`);
}

/**
 * Saves session to localStorage for reconnection.
 */
export function saveSession(data: SessionData): void {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
	}
}

/**
 * Retrieves saved session from localStorage.
 */
export function getSession(): SessionData | null {
	if (typeof localStorage === 'undefined') return null;
	const stored = localStorage.getItem(SESSION_STORAGE_KEY);
	if (!stored) return null;
	try {
		return JSON.parse(stored) as SessionData;
	} catch {
		return null;
	}
}

/**
 * Clears saved session from localStorage.
 */
export function clearSession(): void {
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(SESSION_STORAGE_KEY);
	}
}

/**
 * Creates a new lobby and adds the host as the first player in seat 0.
 */
export async function createLobby(playerName: string): Promise<CreateLobbyResult> {
	const validation = validatePlayerName(playerName);
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}

	const code = generateLobbyCode();
	const playerId = await ensureAuth();
	const now = Date.now();

	const lobby: Lobby = {
		code,
		host: playerId,
		createdAt: now,
		status: 'waiting',
		players: {
			[playerId]: {
				name: validation.name!,
				seat: 0,
				connected: true,
				lastSeen: now
			}
		},
		game: null
	};

	try {
		const lobbyRef = getLobbyRef(code);
		await set(lobbyRef, lobby);

		// Set up disconnect handler
		const playerRef = ref(getFirebaseDatabase(), `lobbies/${code}/players/${playerId}`);
		onDisconnect(playerRef).update({
			connected: false,
			lastSeen: serverTimestamp()
		});

		saveSession({ playerId, lobbyCode: code, playerName: validation.name! });

		return { success: true, lobbyCode: code, playerId };
	} catch (error) {
		console.error('Failed to create lobby:', error);
		return { success: false, error: 'Kon lobby niet aanmaken' };
	}
}

/**
 * Joins an existing lobby with the given code.
 */
export async function joinLobby(
	lobbyCode: string,
	playerName: string,
	preferredSeat?: Seat
): Promise<JoinLobbyResult> {
	const validation = validatePlayerName(playerName);
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}

	const trimmedCode = lobbyCode.trim();
	if (!/^\d{6}$/.test(trimmedCode)) {
		return { success: false, error: 'Ongeldige lobbycode' };
	}

	try {
		const lobbyRef = getLobbyRef(trimmedCode);
		const snapshot = await get(lobbyRef);

		if (!snapshot.exists()) {
			return { success: false, error: 'Lobby niet gevonden' };
		}

		const lobby = snapshot.val() as Lobby;

		if (lobby.status !== 'waiting') {
			return { success: false, error: 'Spel is al gestart' };
		}

		// Check for duplicate name
		const existingNames = Object.values(lobby.players || {}).map((p) => p.name.toLowerCase());
		if (existingNames.includes(validation.name!.toLowerCase())) {
			return { success: false, error: 'Deze naam is al in gebruik' };
		}

		// Find available seat
		const occupiedSeats = new Set(Object.values(lobby.players || {}).map((p) => p.seat));

		let seat: Seat;
		if (preferredSeat !== undefined && !occupiedSeats.has(preferredSeat)) {
			seat = preferredSeat;
		} else if (preferredSeat === 'table' && occupiedSeats.has('table')) {
			return { success: false, error: 'Tafel positie is al bezet' };
		} else {
			// Find first available player seat
			const availableSeats = ([0, 1, 2, 3] as PlayerSeat[]).filter((s) => !occupiedSeats.has(s));
			if (availableSeats.length === 0) {
				// Try table position if no player seats available
				if (!occupiedSeats.has('table')) {
					seat = 'table';
				} else {
					return { success: false, error: 'Lobby is vol' };
				}
			} else {
				seat = availableSeats[0];
			}
		}

		const playerId = await ensureAuth();
		const now = Date.now();

		const player: Player = {
			name: validation.name!,
			seat,
			connected: true,
			lastSeen: now
		};

		const playerRef = ref(getFirebaseDatabase(), `lobbies/${trimmedCode}/players/${playerId}`);
		await set(playerRef, player);

		// Set up disconnect handler
		onDisconnect(playerRef).update({
			connected: false,
			lastSeen: serverTimestamp()
		});

		saveSession({ playerId, lobbyCode: trimmedCode, playerName: validation.name! });

		return { success: true, playerId };
	} catch (error) {
		console.error('Failed to join lobby:', error);
		return { success: false, error: 'Kon niet deelnemen aan lobby' };
	}
}

/**
 * Leaves the current lobby.
 */
export async function leaveLobby(lobbyCode: string, playerId: string): Promise<void> {
	try {
		const lobbyRef = getLobbyRef(lobbyCode);
		const snapshot = await get(lobbyRef);

		if (!snapshot.exists()) {
			clearSession();
			return;
		}

		const lobby = snapshot.val() as Lobby;
		const playerCount = Object.keys(lobby.players || {}).length;

		if (playerCount <= 1) {
			// Last player — delete the whole lobby atomically
			// (must do this before removing self, otherwise auth.uid is no longer a member)
			await remove(lobbyRef);
		} else {
			// Multiple players: transfer host if needed, then remove self
			if (lobby.host === playerId) {
				const newHostId = getNewHost(lobby.players || {}, playerId);
				if (newHostId) {
					await update(lobbyRef, { host: newHostId });
				}
			}

			const playerRef = ref(getFirebaseDatabase(), `lobbies/${lobbyCode}/players/${playerId}`);
			await remove(playerRef);
		}

		clearSession();
	} catch (error) {
		console.error('Failed to leave lobby:', error);
		clearSession();
	}
}

/**
 * Changes seat in the lobby. If the seat is occupied, swaps with that player.
 */
export async function changeSeat(
	lobbyCode: string,
	playerId: string,
	newSeat: Seat
): Promise<{ success: boolean; error?: string }> {
	try {
		const lobbyRef = getLobbyRef(lobbyCode);
		const snapshot = await get(lobbyRef);

		if (!snapshot.exists()) {
			return { success: false, error: 'Lobby niet gevonden' };
		}

		const lobby = snapshot.val() as Lobby;
		const players = lobby.players || {};

		if (!players[playerId]) {
			return { success: false, error: 'Speler niet gevonden' };
		}

		const currentSeat = players[playerId].seat;

		// Find player in target seat (if any)
		let playerInTargetSeat: string | null = null;
		for (const [pid, player] of Object.entries(players)) {
			if (player.seat === newSeat && pid !== playerId) {
				playerInTargetSeat = pid;
				break;
			}
		}

		const updates: Record<string, Seat> = {};
		updates[`players/${playerId}/seat`] = newSeat;

		// Swap seats if target is occupied
		if (playerInTargetSeat) {
			updates[`players/${playerInTargetSeat}/seat`] = currentSeat;
		}

		await update(lobbyRef, updates);
		return { success: true };
	} catch (error) {
		console.error('Failed to change seat:', error);
		return { success: false, error: 'Kon niet van stoel wisselen' };
	}
}

/**
 * Subscribes to lobby updates.
 */
export function subscribeLobby(
	lobbyCode: string,
	callback: (lobby: Lobby | null) => void
): Unsubscribe {
	const lobbyRef = getLobbyRef(lobbyCode);
	return onValue(lobbyRef, (snapshot) => {
		if (snapshot.exists()) {
			callback(snapshot.val() as Lobby);
		} else {
			callback(null);
		}
	});
}

/**
 * Updates player's lastSeen timestamp and connected status.
 * Only updates if the lobby and player exist to avoid creating orphan data.
 */
export async function updatePlayerStatus(
	lobbyCode: string,
	playerId: string,
	connected: boolean
): Promise<void> {
	try {
		// First check if the player exists to avoid creating orphan data
		const playerRef = ref(getFirebaseDatabase(), `lobbies/${lobbyCode}/players/${playerId}`);
		const snapshot = await get(playerRef);

		if (!snapshot.exists()) {
			// Player doesn't exist, nothing to update
			return;
		}

		await update(playerRef, {
			connected,
			lastSeen: serverTimestamp()
		});
	} catch (error) {
		console.error('Failed to update player status:', error);
	}
}

/**
 * Starts the game (only host can call this).
 */
export async function startGame(
	lobbyCode: string,
	playerId: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const lobbyRef = getLobbyRef(lobbyCode);
		const snapshot = await get(lobbyRef);

		if (!snapshot.exists()) {
			return { success: false, error: 'Lobby niet gevonden' };
		}

		const lobby = snapshot.val() as Lobby;

		if (lobby.host !== playerId) {
			return { success: false, error: 'Alleen de host kan het spel starten' };
		}

		if (lobby.status !== 'waiting') {
			return { success: false, error: 'Spel is al gestart' };
		}

		// Check that all 4 seats are filled
		const players = lobby.players || {};
		const filledSeats = new Set<PlayerSeat>();
		for (const player of Object.values(players)) {
			if (player.seat !== 'table') {
				filledSeats.add(player.seat);
			}
		}

		if (filledSeats.size !== 4) {
			return { success: false, error: 'Niet alle stoelen zijn bezet' };
		}

		await update(lobbyRef, { status: 'playing' });

		// Initialize game state (deal cards, set trump chooser)
		await initializeGame(lobbyCode);

		return { success: true };
	} catch (error) {
		console.error('Failed to start game:', error);
		return { success: false, error: 'Kon spel niet starten' };
	}
}

/**
 * Attempts to reconnect to a previous session.
 */
export async function reconnect(): Promise<{
	success: boolean;
	lobby?: Lobby;
	playerId?: string;
	error?: string;
}> {
	const session = getSession();
	if (!session) {
		return { success: false, error: 'Geen sessie gevonden' };
	}

	try {
		const lobbyRef = getLobbyRef(session.lobbyCode);
		const snapshot = await get(lobbyRef);

		if (!snapshot.exists()) {
			clearSession();
			return { success: false, error: 'Lobby bestaat niet meer' };
		}

		const lobby = snapshot.val() as Lobby;
		const player = lobby.players?.[session.playerId];

		if (!player) {
			clearSession();
			return { success: false, error: 'Speler niet gevonden in lobby' };
		}

		// Update connection status
		await updatePlayerStatus(session.lobbyCode, session.playerId, true);

		// Re-setup disconnect handler
		const playerRef = ref(
			getFirebaseDatabase(),
			`lobbies/${session.lobbyCode}/players/${session.playerId}`
		);
		onDisconnect(playerRef).update({
			connected: false,
			lastSeen: serverTimestamp()
		});

		return { success: true, lobby, playerId: session.playerId };
	} catch (error) {
		console.error('Failed to reconnect:', error);
		clearSession();
		return { success: false, error: 'Kon niet opnieuw verbinden' };
	}
}
