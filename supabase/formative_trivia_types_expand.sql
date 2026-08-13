-- Expand trivia question types (run if formative_trivia.sql already applied).
alter table public.trivia_questions drop constraint if exists trivia_questions_type_check;

alter table public.trivia_questions
  add constraint trivia_questions_type_check
  check (type in (
    'short_answer',
    'multiple_choice',
    'true_false',
    'image',
    'content',
    'audio',
    'video',
    'embed',
    'multiple_selection',
    'dropdown',
    'matching',
    'categorize',
    'file_response',
    'audio_response',
    'drawing',
    'hot_spot'
  ));
