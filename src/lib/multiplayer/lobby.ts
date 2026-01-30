/**
 * Lobby service for creating, joining, and managing game lobbies.
 */

import {
	ref,
	set,
	get,
	update,
	remove,
	onValue,
	onDisconnect,
	serverTimestamp,
	type Unsubscribe,
} from 'firebase/database';
import { getDb } from './firebase';
import type { Lobby, LobbyPlayer, Seat, LocalSession } from './types';

/**
 * Generate a random 6-character lobby code.
 */
export function generateLobbyCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

/**
 * Generate a unique player ID.
 */
export function generatePlayerId(): string {
	return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get the Firebase reference path for a lobby.
 */
function lobbyRef(code: string) {
	return ref(getDb(), `lobbies/${code}`);
}

/**
 * Get the Firebase reference path for a player in a lobby.
 */
function playerRef(code: string, playerId: string) {
	return ref(getDb(), `lobbies/${code}/players/${playerId}`);
}

/**
 * Create a new lobby and join as host.
 */
export async function createLobby(playerName: string): Promise<LocalSession> {
	const code = generateLobbyCode();
	const playerId = generatePlayerId();

	const lobby: Lobby = {
		code,
		host: playerId,
		createdAt: Date.now(),
		status: 'waiting',
		players: {
			[playerId]: {
				name: playerName,
				seat: 0, // Host is always South
				connected: true,
				lastSeen: Date.now(),
			},
		},
		game: null,
	};

	// Check if code already exists (unlikely but possible)
	const existing = await get(lobbyRef(code));
	if (existing.exists()) {
		// Try again with a new code
		return createLobby(playerName);
	}

	await set(lobbyRef(code), lobby);

	// Set up disconnect handler
	await setupDisconnectHandler(code, playerId);

	return {
		playerId,
		playerName,
		lobbyCode: code,
	};
}

/**
 * Join an existing lobby.
 * Supports seat reclamation: if a disconnected player with the same name exists,
 * the new player will reclaim their seat (even if game is in progress).
 */
export async function joinLobby(
	code: string,
	playerName: string,
	preferredSeat?: Seat
): Promise<LocalSession> {
	const normalizedCode = code.toUpperCase().trim();

	// Check if lobby exists
	const snapshot = await get(lobbyRef(normalizedCode));
	if (!snapshot.exists()) {
		throw new Error('Lobby not found');
	}

	const lobby = snapshot.val() as Lobby;

	// Check if name is taken by a connected player
	const connectedWithSameName = Object.values(lobby.players || {}).find(
		(p) => p.name?.toLowerCase() === playerName?.toLowerCase() && p.connected
	);
	if (connectedWithSameName) {
		throw new Error('Name already taken');
	}

	// Check for disconnected player with same name (seat reclaim)
	const disconnectedPlayerId = findDisconnectedPlayerByName(lobby, playerName);
	if (disconnectedPlayerId) {
		// Reclaim the seat, even if game is in progress
		const newPlayerId = generatePlayerId();
		return reclaimSeat(normalizedCode, disconnectedPlayerId, newPlayerId, playerName);
	}

	// Normal join flow - only allowed in 'waiting' status
	if (lobby.status !== 'waiting') {
		throw new Error('Game already in progress');
	}

	// Find available seat
	const takenSeats = new Set(
		Object.values(lobby.players || {}).map((p) => p.seat)
	);

	let seat: Seat;
	if (preferredSeat !== undefined && !takenSeats.has(preferredSeat)) {
		seat = preferredSeat;
	} else if (preferredSeat === 'spectator' || preferredSeat === 'table') {
		seat = preferredSeat;
	} else {
		// Find first available player seat
		const availableSeats: Seat[] = ([1, 2, 3] as Seat[]).filter(
			(s) => !takenSeats.has(s)
		);
		if (availableSeats.length === 0) {
			// All player seats taken, join as spectator
			seat = 'spectator';
		} else {
			seat = availableSeats[0];
		}
	}

	const playerId = generatePlayerId();

	const player: LobbyPlayer = {
		name: playerName,
		seat,
		connected: true,
		lastSeen: Date.now(),
	};

	await set(playerRef(normalizedCode, playerId), player);

	// Set up disconnect handler
	await setupDisconnectHandler(normalizedCode, playerId);

	return {
		playerId,
		playerName,
		lobbyCode: normalizedCode,
	};
}

/**
 * Leave a lobby.
 */
export async function leaveLobby(code: string, playerId: string): Promise<void> {
	const snapshot = await get(lobbyRef(code));
	if (!snapshot.exists()) {
		return; // Lobby doesn't exist, nothing to do
	}

	const lobby = snapshot.val() as Lobby;

	// Remove the player
	await remove(playerRef(code, playerId));

	// If this was the host, either transfer host or delete lobby
	if (lobby.host === playerId) {
		const remainingPlayers = Object.keys(lobby.players || {}).filter(
			(id) => id !== playerId
		);

		if (remainingPlayers.length === 0) {
			// No players left, delete lobby
			await remove(lobbyRef(code));
		} else {
			// Transfer host to first remaining player
			await update(lobbyRef(code), { host: remainingPlayers[0] });
		}
	}
}

/**
 * Change a player's seat.
 */
export async function changeSeat(
	code: string,
	playerId: string,
	newSeat: Seat
): Promise<void> {
	const snapshot = await get(lobbyRef(code));
	if (!snapshot.exists()) {
		throw new Error('Lobby not found');
	}

	const lobby = snapshot.val() as Lobby;

	// Check if seat is available (unless spectator/table)
	if (typeof newSeat === 'number') {
		const takenSeats = Object.entries(lobby.players || {})
			.filter(([id]) => id !== playerId)
			.map(([, p]) => p.seat);

		if (takenSeats.includes(newSeat)) {
			throw new Error('Seat already taken');
		}
	}

	await update(playerRef(code, playerId), { seat: newSeat });
}

/**
 * Get lobby data once.
 */
export async function getLobby(code: string): Promise<Lobby | null> {
	const snapshot = await get(lobbyRef(code));
	if (!snapshot.exists()) {
		return null;
	}
	return snapshot.val() as Lobby;
}

/**
 * Subscribe to lobby updates.
 */
export function subscribeLobby(
	code: string,
	callback: (lobby: Lobby | null) => void
): Unsubscribe {
	return onValue(lobbyRef(code), (snapshot) => {
		if (!snapshot.exists()) {
			callback(null);
		} else {
			callback(snapshot.val() as Lobby);
		}
	});
}

/**
 * Check if all player seats are filled.
 */
export function isLobbyFull(lobby: Lobby): boolean {
	const playerSeats = Object.values(lobby.players || {})
		.map((p) => p.seat)
		.filter((s) => typeof s === 'number');

	return playerSeats.length === 4;
}

/**
 * Get the list of players sorted by seat.
 */
export function getPlayersBySeat(
	lobby: Lobby
): Array<{ playerId: string; player: LobbyPlayer }> {
	return Object.entries(lobby.players || {})
		.map(([playerId, player]) => ({ playerId, player }))
		.sort((a, b) => {
			// Sort by seat number, spectators/table at the end
			const seatA = typeof a.player.seat === 'number' ? a.player.seat : 10;
			const seatB = typeof b.player.seat === 'number' ? b.player.seat : 10;
			return seatA - seatB;
		});
}

/**
 * Set up a handler to mark player as disconnected when they leave.
 */
async function setupDisconnectHandler(
	code: string,
	playerId: string
): Promise<void> {
	const playerRefPath = playerRef(code, playerId);
	await onDisconnect(playerRefPath).update({
		connected: false,
		lastSeen: serverTimestamp(),
	});
}

/**
 * Mark a player as connected (call on reconnect).
 */
export async function markConnected(
	code: string,
	playerId: string
): Promise<void> {
	await update(playerRef(code, playerId), {
		connected: true,
		lastSeen: Date.now(),
	});

	// Re-setup disconnect handler
	await setupDisconnectHandler(code, playerId);
}

/**
 * Find a disconnected player in the lobby by name.
 * Returns the playerId if found, null otherwise.
 */
export function findDisconnectedPlayerByName(
	lobby: Lobby,
	playerName: string
): string | null {
	if (!playerName) return null;
	for (const [playerId, player] of Object.entries(lobby.players || {})) {
		if (
			player.name?.toLowerCase() === playerName.toLowerCase() &&
			!player.connected
		) {
			return playerId;
		}
	}
	return null;
}

/**
 * Reclaim a disconnected player's seat.
 * Updates the player record with a new playerId and marks as connected.
 */
export async function reclaimSeat(
	code: string,
	oldPlayerId: string,
	newPlayerId: string,
	playerName: string
): Promise<LocalSession> {
	const normalizedCode = code.toUpperCase().trim();

	const snapshot = await get(lobbyRef(normalizedCode));
	if (!snapshot.exists()) {
		throw new Error('Lobby not found');
	}

	const lobby = snapshot.val() as Lobby;
	const oldPlayer = lobby.players[oldPlayerId];

	if (!oldPlayer) {
		throw new Error('Player not found');
	}

	if (oldPlayer.connected) {
		throw new Error('Player is still connected');
	}

	// Create new player entry with the old seat
	const newPlayer: LobbyPlayer = {
		name: playerName,
		seat: oldPlayer.seat,
		connected: true,
		lastSeen: Date.now(),
	};

	// Atomic update: remove old player, add new player
	const updates: Record<string, unknown> = {};
	updates[`players/${oldPlayerId}`] = null;
	updates[`players/${newPlayerId}`] = newPlayer;

	// If old player was host, transfer to new player
	if (lobby.host === oldPlayerId) {
		updates['host'] = newPlayerId;
	}

	await update(lobbyRef(normalizedCode), updates);

	// Set up disconnect handler
	await setupDisconnectHandler(normalizedCode, newPlayerId);

	return {
		playerId: newPlayerId,
		playerName,
		lobbyCode: normalizedCode,
	};
}
