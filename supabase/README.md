# Supabase SQL scripts

Run these manually in the Supabase SQL editor or via CLI as needed.

- `add_profile_color_gradient.sql` – profile color/gradient support
- `supabase_add_tracker_profile_url.sql` – tracker profile URL field
- `supabase_shop_gold_leaderboard.sql` – gold leaderboard view/function
- `supabase_update_contributor_build_rpc.sql` – contributor build RPC
- `community_guides.sql` – god/role guides table, Featured flag trigger, RLS, and `update_community_guide` RPC
- `add_starting_final_relic_columns.sql` – optional `starting_relic` / `final_relic` on `contributor_builds` and `community_builds`
- `discord_bot_shared_builds.sql` – secret-link custom builds for a Discord bot (`discord_bot_shared_builds` + RPCs `get_discord_bot_shared_build` / `save_discord_bot_shared_build` / `list_discord_bot_shared_builds`); app route `app/discord-build/[token].jsx`
