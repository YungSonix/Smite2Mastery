-- SMITE 2 TRIVIA contest seed. Paste into Supabase SQL Editor.
-- Re-runnable: replaces slug smite-2-trivia. Owner must match host login (YungSonix).

delete from public.trivia_questions
  where quiz_id in (select id from public.trivia_quizzes where slug = 'smite-2-trivia');
delete from public.trivia_responses
  where quiz_id in (select id from public.trivia_quizzes where slug = 'smite-2-trivia');
delete from public.trivia_quizzes where slug = 'smite-2-trivia';

with q as (
  insert into public.trivia_quizzes (slug, title, owner_username, join_code, is_assigned, settings)
  values (
    'smite-2-trivia',
    'SMITE 2 TRIVIA',
    'YungSonix',
    'S2TRIV',
    true,
    '{"show_scores":false,"show_answers":false,"allow_retake":false,"after_submission":"hidden","time_limit_seconds":480,"opens_at":"2026-08-14T17:00:00-04:00","closes_at":"2026-08-18T15:00:00-04:00","discord_field_label":"Discord IGN (First Last)","ingame_field_label":"In-Game Name","instructions":"Trivia Quiz for Smite Discord Community\n\nStart Time: 8/14/26 5PM Eastern\nTime Limit: 8 minutes (starts when you click Start)\nEnd Time: 8/18/26 3PM Eastern\n\nFAILURE TO PUT FIRST NAME / LAST NAME AS YOUR DISCORD IGN WILL RESULT IN DISQUALIFICATION\n\nPLEASE NO CHEATING!\n\nCOMPETITION IS NOT AFFILIATED WITH HI-REZ\n\nPlease no sharing answers or discussing until after the event is over!\n\nIf there are any ties, the two people will have to answer a set of 3 questions I will provide at that time.\n\nOnly one attempt per user — I will know.\n\nLastly have fun with it and let me know what I can do better next time.\n\nNote: You will need a speaker or some way to play audio, as there is one audio question. (If it doesn''t work for you, let me know what browser/device you are on.)\n\nIf you have any questions feel free to DM @YungSonix on Discord.\n\nHeader Art by https://www.deviantart.com/kaiology\n\nRewards:\n1st — Saga code + Diamonds + 1 Dapper Demon Ah Puch Traveler\n2nd — 1 Silkshade Daji Traveler + 1 Dapper Demon Ah Puch Traveler\n3rd — 1 Silkshade Daji Traveler + 1 Dapper Demon Ah Puch Traveler\n4th — 1 Hot Diggity Odin Traveler\n5th — 1 Hot Diggity Odin Traveler\n\nWorks for Console / PC\nWinners HAVE 24 HOURS TO DM ME FOR THEIR CODE — otherwise a runner-up will be chosen."}'::jsonb
  )
  returning id
)
insert into public.trivia_questions
  (quiz_id, sort_order, type, prompt, points, required, options, correct, image_url, meta)
values
  ((select id from q), 0, 'short_answer', 'Discord Username', 0, true, '[]'::jsonb, '{"answers":[]}'::jsonb, null, '{"is_discord_gate":true}'::jsonb),
  ((select id from q), 1, 'short_answer', 'In-Game Name', 0, true, '[]'::jsonb, '{"answers":[]}'::jsonb, null, '{"is_ingame_gate":true}'::jsonb),
  ((select id from q), 2, 'multiple_choice', 'What was this item originally called in the Smite Alpha?', 1, true, '["Obsidian Shard","Titans Shard","Baylor''s Eye","Evil Eye"]'::jsonb, '{"index":2}'::jsonb, 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/Trivia/smite2-community/obsidian-shard.png', '{"randomize_order":true}'::jsonb),
  ((select id from q), 3, 'multiple_choice', 'How many Vulcan Mods are there?', 1, true, '["9","11","7","6","12"]'::jsonb, '{"index":0}'::jsonb, null, '{"randomize_order":true}'::jsonb),
  ((select id from q), 4, 'multiple_choice', 'What is this item called?', 1, true, '["Wish Granting Pearl","Wish-Granting Pearl","Flaming Pearl","Nimble Pearl"]'::jsonb, '{"index":1}'::jsonb, 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/Trivia/smite2-community/wish-granting-pearl.png', '{"randomize_order":true}'::jsonb),
  ((select id from q), 5, 'multiple_choice', 'Choose the correct god this skin belongs to.', 1, true, '["Neith","Sol","Da Ji","Discordia"]'::jsonb, '{"index":2}'::jsonb, 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/Trivia/smite2-community/silkshade-daji-crop.png', '{"randomize_order":true,"media":"image"}'::jsonb),
  ((select id from q), 6, 'multiple_choice', 'Choose the correct god this voice line belongs to.', 1, true, '["Amaterasu","Artio","Neith","Cupid","Sol"]'::jsonb, '{"index":0}'::jsonb, 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/assets/app/data/VoiceAudio/Amaterasu/Skin00_Base/VGS/VOX_VGS_Emote_Yes.WAV', '{"randomize_order":true,"media":"audio","attached_from":"audio"}'::jsonb),
  ((select id from q), 7, 'multiple_selection', 'Pick the God that has this aspect icon. (May or may not be more than one God)', 4, true, '["Achilles","Kali","Thor","Khepri","Hun Batz","Sun Wukong","Ne Zha","Charon","Athena","Neith"]'::jsonb, '{"indices":[0,1,5,8]}'::jsonb, 'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master/app/data/Trivia/smite2-community/aspect-upward-arrow.png', '{"randomize_order":true,"allow_partial_credit":true}'::jsonb),
  ((select id from q), 8, 'true_false', 'There was 15 Gods that were released with the first weekend of the Smite 2 Alpha.', 1, true, '["True","False"]'::jsonb, '{"index":1}'::jsonb, null, '{}'::jsonb),
  ((select id from q), 9, 'multiple_choice', 'Who was the first official "new" god that came to Smite 2?', 1, true, '["Hecate","Aladdin","Mordred","Nut","Princess Bari"]'::jsonb, '{"index":0}'::jsonb, null, '{"randomize_order":true}'::jsonb),
  ((select id from q), 10, 'short_answer', 'Achilles Aspect is called Aspect of the {{blank}}', 1, true, '[]'::jsonb, '{"answers":["Prowess","prowess"]}'::jsonb, null, '{"kind":"fill_blank"}'::jsonb);
