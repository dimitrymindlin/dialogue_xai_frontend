import { writable } from 'svelte/store';
import type { TUserDemographics } from '$lib/types';

export const userDemographics = writable<TUserDemographics | undefined>(undefined);
export const currentUserId = writable<string | null>(null); 