import { writable } from 'svelte/store';
import type { TUserDemographics } from '$lib/types';

export const userDemographics = writable<TUserDemographics | undefined>(undefined); 