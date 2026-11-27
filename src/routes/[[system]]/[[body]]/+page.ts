import { error } from '@sveltejs/kit';
import { resolveFocus } from '$lib/universe/content';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const focus = resolveFocus(params.system, params.body);
	if (!focus) error(404, 'Lost in space');
	return { system: params.system ?? null, body: params.body ?? null };
};
