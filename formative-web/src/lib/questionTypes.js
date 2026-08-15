/** Client-side catalog for Add Item modal. */

export const ADD_GROUPS = [
  {
    id: 'basics',
    label: 'Basics',
    items: [
      { id: 'mc', label: 'Multiple Choice', type: 'multiple_choice', icon: 'radio' },
      { id: 'ms', label: 'Multiple Selection', type: 'multiple_selection', icon: 'check' },
      { id: 'tf', label: 'True or False', type: 'true_false', icon: 'radio' },
      { id: 'dd', label: 'Dropdown', type: 'dropdown', icon: 'select' },
      { id: 'sa', label: 'Short Answer', type: 'short_answer', icon: 'text' },
    ],
  },
  {
    id: 'written',
    label: 'Written',
    items: [
      { id: 'fib', label: 'Fill in the Blank', type: 'fill_blank', icon: 'blank' },
      { id: 'free', label: 'Free Response', type: 'free_response', icon: 'paragraph' },
      { id: 'hottext', label: 'Hot Text', type: 'hot_text', icon: 'highlight' },
      { id: 'graph', label: 'Graphing', type: 'graphing', icon: 'chart' },
    ],
  },
  {
    id: 'match',
    label: 'Match & sort',
    items: [
      { id: 'match', label: 'Matching', type: 'matching', icon: 'link' },
      { id: 'matchtable', label: 'Match Table Grid', type: 'match_table', icon: 'grid' },
      { id: 'cat', label: 'Categorize', type: 'categorize', icon: 'folders' },
      { id: 'order', label: 'Order list', type: 'ordering', icon: 'drag' },
    ],
  },
  {
    id: 'uploads',
    label: 'Student uploads',
    items: [
      { id: 'file', label: 'File Response', type: 'file_response', icon: 'file' },
      { id: 'audior', label: 'Audio Response', type: 'audio_response', icon: 'mic' },
      { id: 'draw', label: 'Drawing', type: 'drawing', icon: 'pen' },
      { id: 'hotspot', label: 'Hot Spot', type: 'hot_spot', icon: 'target' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    items: [
      { id: 'image', label: 'Image', type: 'image', icon: 'image' },
      { id: 'audio', label: 'Audio', type: 'audio', icon: 'audio' },
      { id: 'video', label: 'Video', type: 'video', icon: 'video' },
      { id: 'text', label: 'Text', type: 'text', icon: 'block' },
      { id: 'embed', label: 'Embed', type: 'embed', icon: 'embed' },
    ],
  },
];

/** Flat list kept for any callers that still expect ADD_ITEMS. */
export const ADD_ITEMS = ADD_GROUPS.flatMap((g) =>
  g.items.map((item) => ({ ...item, group: g.label }))
);

export const TYPE_LABEL = {
  short_answer: 'Short Answer',
  multiple_choice: 'Multiple Choice',
  true_false: 'True or False',
  multiple_selection: 'Multiple Selection',
  dropdown: 'Dropdown',
  matching: 'Matching',
  categorize: 'Categorize',
  ordering: 'Order list',
  drag_drop: 'Order list',
  file_response: 'File Response',
  audio_response: 'Audio Response',
  drawing: 'Drawing',
  hot_spot: 'Hot Spot',
  image: 'Image',
  audio: 'Audio',
  video: 'Video',
  content: 'Text',
  embed: 'Embed',
};

export function typeLabel(q) {
  if (q?.meta?.is_discord_gate) return 'Discord Username';
  if (q?.meta?.is_ingame_gate) return 'In-Game Name';
  if (q?.meta?.kind === 'free_response') return 'Free Response';
  if (q?.meta?.kind === 'fill_blank') return 'Fill in the Blank';
  if (q?.meta?.kind === 'graphing') return 'Graphing';
  if (q?.meta?.kind === 'hot_text') return 'Hot Text';
  if (q?.type === 'ordering' || q?.meta?.kind === 'order') return 'Order list';
  if (q?.meta?.kind === 'drag_drop') return 'Categorize';
  return TYPE_LABEL[q?.type] || q?.type || 'Question';
}

export const SWITCHABLE_TYPES = [
  { id: 'multiple_choice', label: 'Multiple Choice' },
  { id: 'multiple_selection', label: 'Multiple Selection' },
  { id: 'true_false', label: 'True or False' },
  { id: 'dropdown', label: 'Dropdown' },
  { id: 'short_answer', label: 'Short Answer' },
  { id: 'fill_blank', label: 'Fill in the Blank' },
  { id: 'matching', label: 'Matching' },
  { id: 'ordering', label: 'Order list' },
  { id: 'categorize', label: 'Categorize' },
];

export function switchTypeValue(q) {
  if (q?.meta?.kind === 'fill_blank') return 'fill_blank';
  if (q?.type === 'ordering' || q?.meta?.kind === 'order') return 'ordering';
  if (q?.meta?.kind === 'drag_drop') return 'categorize';
  return q?.type || 'multiple_choice';
}

/** Question types you can attach to an Image / Audio content block via +. */
export const MEDIA_ATTACH_CHOICES = [
  { type: 'multiple_choice', label: 'Multiple Choice' },
  { type: 'true_false', label: 'True or False' },
  { type: 'multiple_selection', label: 'Multiple Selection' },
  { type: 'dropdown', label: 'Dropdown' },
  { type: 'short_answer', label: 'Short Answer' },
  { type: 'fill_blank', label: 'Fill in the Blank' },
  { type: 'hot_spot', label: 'Hot Spot' },
];

/** Client defaults when converting media → scored question (keep image_url separately). */
export function questionDefaultsForType(type) {
  const requested = String(type || 'multiple_choice');
  if (requested === 'fill_blank') {
    return {
      type: 'short_answer',
      prompt: '{{blank}}',
      points: 1,
      required: false,
      options: [],
      correct: { answers: [''] },
      meta: { kind: 'fill_blank' },
    };
  }
  if (requested === 'free_response') {
    return {
      type: 'short_answer',
      prompt: 'Free response',
      points: 0,
      required: false,
      options: [],
      correct: { answers: [] },
      meta: { kind: 'free_response' },
    };
  }
  if (requested === 'true_false') {
    return {
      type: 'true_false',
      prompt: 'True or false?',
      points: 1,
      required: false,
      options: ['True', 'False'],
      correct: { index: 0 },
      meta: {},
    };
  }
  if (requested === 'multiple_selection') {
    return {
      type: 'multiple_selection',
      prompt: 'Select all that apply',
      points: 1,
      required: false,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: { indices: [0] },
      meta: {},
    };
  }
  if (requested === 'dropdown') {
    return {
      type: 'dropdown',
      prompt: 'Choose one',
      points: 1,
      required: false,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct: { index: 0 },
      meta: {},
    };
  }
  if (requested === 'short_answer') {
    return {
      type: 'short_answer',
      prompt: 'Short answer question',
      points: 1,
      required: false,
      options: [],
      correct: { answers: [''] },
      meta: {},
    };
  }
  if (requested === 'hot_spot') {
    return {
      type: 'hot_spot',
      prompt: 'Click the correct spot on the image',
      points: 1,
      required: false,
      options: [],
      correct: { x: 50, y: 50, r: 10 },
      meta: {},
    };
  }
  if (requested === 'matching' || requested === 'match_table') {
    return {
      type: 'matching',
      prompt: 'Match each item',
      points: 1,
      required: false,
      options: [
        { left: 'Left 1', right: 'Right 1' },
        { left: 'Left 2', right: 'Right 2' },
      ],
      correct: { map: { 'Left 1': 'Right 1', 'Left 2': 'Right 2' } },
      meta: {},
    };
  }
  if (requested === 'ordering' || requested === 'drag_drop') {
    return {
      type: 'ordering',
      prompt: 'Put these in the correct order, top to bottom.',
      points: 1,
      required: false,
      options: ['First', 'Second', 'Third', 'Fourth'],
      correct: { order: ['First', 'Second', 'Third', 'Fourth'] },
      meta: { kind: 'order' },
    };
  }
  if (requested === 'categorize') {
    return {
      type: 'categorize',
      prompt: 'Sort each item into a category',
      points: 1,
      required: false,
      options: {
        categories: ['Category A', 'Category B'],
        items: ['Item 1', 'Item 2', 'Item 3'],
      },
      correct: { map: { 'Item 1': 'Category A', 'Item 2': 'Category B', 'Item 3': 'Category A' } },
      meta: {},
    };
  }
  return {
    type: 'multiple_choice',
    prompt: 'Multiple choice question',
    points: 1,
    required: false,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correct: { index: 0 },
    meta: {},
  };
}
