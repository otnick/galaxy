<script lang="ts">
	import GlassPanel from '$lib/components/GlassPanel.svelte';
</script>

<section class="mx-auto max-w-3xl px-5 pb-12 pt-28">
	<GlassPanel className="glow-cyan">
		<p class="text-soft text-xs uppercase tracking-[0.2em]">Contact</p>
		<h1 class="mt-3 text-3xl font-semibold">Let’s build something luminous.</h1>
		<p class="text-soft mt-3">
			Share project scope, timelines, and goals. I reply quickly for product and creative tech work.
		</p>

		<form class="mt-7 grid gap-4">
			<label class="grid gap-2">
				<span class="text-sm">Name</span>
				<input
					class="rounded-xl border border-white/20 bg-black/25 px-4 py-3 outline-none transition focus:border-white/45"
					type="text"
					placeholder="Your name"
				/>
			</label>
			<label class="grid gap-2">
				<span class="text-sm">Email</span>
				<input
					class="rounded-xl border border-white/20 bg-black/25 px-4 py-3 outline-none transition focus:border-white/45"
					type="email"
					placeholder="you@example.com"
				/>
			</label>
			<label class="grid gap-2">
				<span class="text-sm">Message</span>
				<textarea
					class="min-h-32 rounded-xl border border-white/20 bg-black/25 px-4 py-3 outline-none transition focus:border-white/45"
					placeholder="Project details..."
				></textarea>
			</label>
			<button class="w-fit rounded-full bg-white/16 px-6 py-2.5 text-sm font-medium transition hover:bg-white/26" type="button">
				Send
			</button>
		</form>
	</GlassPanel>
</section>
