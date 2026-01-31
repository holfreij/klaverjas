import type { Player, PlayerSeat } from './types';

/**
 * Generates a random 6-digit lobby code.
 */
export function generateLobbyCode(): string {
	return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
}

export interface NameValidationResult {
	valid: boolean;
	name?: string;
	error?: string;
}

/**
 * Validates and trims a player name.
 * Rules: 3-50 characters after trimming.
 */
export function validatePlayerName(name: string): NameValidationResult {
	const trimmed = name.trim();

	if (trimmed.length === 0) {
		return { valid: false, error: 'Naam mag niet leeg zijn' };
	}

	if (trimmed.length < 3) {
		return { valid: false, error: 'Naam moet minimaal 3 tekens zijn' };
	}

	if (trimmed.length > 50) {
		return { valid: false, error: 'Naam mag maximaal 50 tekens zijn' };
	}

	return { valid: true, name: trimmed };
}

/**
 * Checks if all 4 player seats (0-3) are filled.
 * Table device does not count.
 */
export function canStartGame(players: Record<string, Player>): boolean {
	const filledSeats = new Set<PlayerSeat>();

	for (const player of Object.values(players)) {
		if (player.seat !== 'table') {
			filledSeats.add(player.seat);
		}
	}

	return filledSeats.size === 4;
}

/**
 * Determines who should become the new host when current host disconnects.
 * Returns the player ID with the lowest seat number (excluding table device).
 * Returns null if no eligible player found.
 */
export function getNewHost(
	players: Record<string, Player>,
	currentHostId: string
): string | null {
	let newHostId: string | null = null;
	let lowestSeat: PlayerSeat | null = null;

	for (const [playerId, player] of Object.entries(players)) {
		if (playerId === currentHostId) continue;
		if (player.seat === 'table') continue;

		if (lowestSeat === null || player.seat < lowestSeat) {
			lowestSeat = player.seat;
			newHostId = playerId;
		}
	}

	return newHostId;
}
